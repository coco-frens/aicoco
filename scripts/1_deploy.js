const readline = require('node:readline');
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
})

const hre = require("hardhat");
const ethers = hre.ethers

const { decimals, file } = require('../utils')
const { d } = decimals

const run = async () => {

  const network = process.env.HARDHAT_NETWORK;
  if (typeof (network) === 'undefined') {
    console.log("Try: npx hardhat run --network <network> filepath");
    process.exit(1);
  }

  if (network !== 'hardhat' && network !== 'mainnet' && network !== 'goerli' && network !== 'sepolia') {
    console.log("Unsupported Network");
    process.exit(1);
  }

  const [owner] = await ethers.getSigners()

  function isSet(envVar) {
    if (!envVar || envVar === '' || envVar.length < 1) {
      return false
    }
    return true
  }

  if (!isSet(process.env.BASE_URI) || 
      !isSet(process.env.ROYALTY_PERC) || 
      !isSet(process.env.CONTROLLER_ADDRESS) ||
      !isSet(process.env.PRICE_PER_TOKEN)
    ) {
    console.log('Initializer Environment variables are not set properly.')
    process.exit(1)
  }

  console.log("\nThe current deployer address is: " + owner.address)
  console.log("The current controller address is: " + process.env.CONTROLLER_ADDRESS)
  console.log("The current network to deploy on is: " + network)
  console.log("The BASE_URI to deploy with is: " + process.env.BASE_URI)
  console.log("The percentage of royalty, in bips is: " + process.env.ROYALTY_PERC)
  console.log("The cost of an NFT will be: " + process.env.PRICE_PER_TOKEN + ' COCO')

  const exists = await file.fileExists(__dirname + '/' + network)
  if (!exists) {
    console.log('Cannot find the directory to store the contract address at: ' + __dirname + '/' + network)
    process.exit()
  }

  // the address of coco
  let aTokenAddress 
  if (network === 'mainnet') {
    aTokenAddress = '0xE6DBeAdD1823B0BCfEB27792500b71e510AF55B3'
  } else if (network === 'hardhat') {
    aTokenAddress = await deployAtoken()
  } else {
    const addressFileExists = await file.fileExists(__dirname + '/' + network + '/A.json') // Atoken
    if (addressFileExists) {
      const _aFile = await file.readFile(__dirname + '/' + network + '/A.json', 'utf8')
      const aFile = JSON.parse(_aFile)
      aTokenAddress = aFile.contract
    }
  }
  if (!aTokenAddress) {
    console.log('Error: Couldnt determine where the base currency contract was...')
    process.exit()
  }

  console.log('Coco Contract Address: ' + aTokenAddress)

  const balance = await ethers.provider.getBalance(owner.address)
  if (Number(balance) < 100) {
    console.log('ETH Balance for ' + owner.address + ' is insufficient: ' + Number(balance))
    process.exit(1)
  }
  console.log('Deployer ETH balance: ' + d(balance, 18))

  const answer = await getAnswer('Check these settings. Continue? (y n)')
  if (answer !== 'y') { 
    console.log('Operation Canceled')
    process.exit(1)
  }

  const pricePerToken = ethers.BigNumber.from(process.env.PRICE_PER_TOKEN)
  const baseUri = process.env.BASE_URI
  const contractUri = process.env.BASE_URI + process.env.CONTRACT_CID
  const parameters = [
    baseUri,
    contractUri,
    process.env.ROYALTY_PERC,
    process.env.CONTROLLER_ADDRESS,
    pricePerToken,
    aTokenAddress
  ]

  // This appeared on the documentation but i dont really know how to get there...
  // const Contract = await ethers.deployContract('AiCoco', parameters)
  // await Contract.waitForDeployment()
  // const contractAddress = Contract.target

  const Contract = await hre.ethers.getContractFactory("AiCoco")
  const contract = await Contract.deploy(...parameters)
  console.log('Transaction sent, awaiting transaction confirmation, dont close...')
  await contract.deployed()
  const contractAddress = contract.address
  
  console.log("AiCoco contract deployed to: " + contractAddress + ' on ' + network)
  await file.writeFile(__dirname + '/' + network + '/1.json', JSON.stringify({contract:contractAddress}, null, 4))
}

const getAnswer =  (message) => {
  return new Promise((resolve) => {
    rl.question(message + '\n > ', async (answer) => {
      if (answer === 'c') {
        console.log('Operation Cancelled')
        process.exit(1)
      }
      resolve(answer)
    })
  })
}

// for network = hardhat testing only
const deployAtoken = async () => {
  const parameters = [
    ethers.BigNumber.from('420690000000000000000000000000000')
  ]
  const Contract = await hre.ethers.getContractFactory("AToken")
  const aTokenContract = await Contract.deploy(...parameters)
  await aTokenContract.deployed()
  aTokenAddress = aTokenContract.address
  console.log("AToken contract deployed to: " + aTokenAddress + ' on hardhat')
  return aTokenAddress
}

; (async () => {
  try {
    await run()
  } catch (error) {
    console.log(error)
    process.exit(1)
  }
  process.exit(0)
})()