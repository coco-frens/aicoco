const readline = require('node:readline');
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
})

const cidsTest = require('../../assets/metadata/cidsTest.json')

const fs = require('fs')
const hre = require("hardhat");
const ethers = hre.ethers

const provider = new ethers.providers.Web3Provider(hre.network.provider)
const BigNumber = ethers.BigNumber

const { decimals, file } = require('../utils')
const { d, displayToWei } = decimals

// First part: Test basic CID values in a contract (nondestructive)
// Second part: Rewrite the CID values using the two contract calls to update.

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

  // the address of coco
  let aTokenAddress
  if (network === 'mainnet') {
    aTokenAddress = '0xE6DBeAdD1823B0BCfEB27792500b71e510AF55B3'
  } else if (network === 'hardhat') {
    aTokenAddress = await deployAtoken()
  } else {
    const addressFileExists = await fs.existsSync(__dirname + '/' + network + '/A.json') // Atoken
    if (addressFileExists) {
      const _aFile = await fs.readFileSync(__dirname + '/' + network + '/A.json', 'utf8')
      const aFile = JSON.parse(_aFile)
      aTokenAddress = aFile.contract
    }
  }
  if (!aTokenAddress) {
    console.log('Error: Couldnt determine where the base currency contract was...')
    process.exit()
  }
  const ATokenContract = await hre.ethers.getContractFactory("AToken")
  const aTokenContract = await ATokenContract.attach(aTokenAddress)

  // read from a file to get deployed contract address
  let contractAddress
  if (network !== 'hardhat') {
    const data = await file.readFile(__dirname + '/' + network + '/1.json')
    if (typeof data === 'undefined') {
      console.log('unable to find implementation on network: ' + network)
      process.exit(1)
    }
    contractAddress = JSON.parse(data).contract
  } else {
    // deploy the contract on hardhat
    const aiCocoContract = await deployAiCoco(aTokenAddress)
    contractAddress = aiCocoContract.address
  }

  const Contract = await hre.ethers.getContractFactory("AiCoco")
  const contract = await Contract.attach(contractAddress)

  const provisionedTokens = (await contract.cidLength()) - 1
  console.log('there have been ' + provisionedTokens + ' provisioned tokens')
  const counter = (await contract.tokenCounter()) - 1
  console.log('there have been ' + counter + ' tokens minted.')
  
  for (let i = 1; i <= counter; i++) {
    const tokenuri = await contract.tokenURI(counter)
    console.log('tokenId: ' + i + ' cid: ' + tokenuri)
  }

  const answer = await getAnswer('Destructive stuff follows, will break onChain cids. continue? (y n)')
  if (answer !== 'y') {
    console.log('Operation Canceled')
    process.exit(1)
  }
  
  const [owner, controller, minter, recipient] = await ethers.getSigners()

  // insert cid and mint four tokens
  const tx = await contract.connect(controller).setCids(cidsTest)
  const receipt = await tx.wait()
  console.log('Test CIDs were set')

  // ...send minter 1T coco
  const oneT = ethers.BigNumber.from('1000000000000' + '000000000000000000')
  const tx1 = await aTokenContract.connect(owner).transfer(minter.address, oneT)
  const receipt1 = await tx1.wait()
  const tx2 = await aTokenContract.connect(minter).approve(contractAddress, oneT)
  const receipt2 = await tx2.wait()
  const tx3 = await contract.connect(controller).setMinting(true)
  const receipt3 = await tx3.wait()
  const tx4 = await contract.connect(minter).publicMintMulti(4)
  const receipt4 = await tx4.wait()
  console.log('4 tokens were minted.')

  const getCids = async () => {
    for (let i = 1; i < 5; i++) {
      const cid = await contract.tokenURI(i)
      console.log('cid for ' + i + ' is: ' + cid)
    }
  }
  await getCids()

  // this doesnt care who owns what. It will update the first cid with gibberish, breaking it
  const tx5 = await contract.connect(controller).setACid('cidGibberish1', 1)
  const tx6 = await contract.connect(controller).updateCids(['cidGibberish2', 'cidGibberish4'], [2, 4])
  console.log('verify that 1,2, and 4 cids are broken:')
  await getCids()
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

// deploy aiCoco for hardhat testing
const deployAiCoco = async (aTokenAddress) => {
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
  const Contract = await hre.ethers.getContractFactory("AiCoco")
  const contract = await Contract.deploy(...parameters)
  await contract.deployed()
  const contractAddress = contract.address
  console.log("AiCoco contract deployed to: " + contractAddress + ' on ' + network)
  return contract
}

const getAnswer = (message) => {
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

  ; (async () => {
    try {
      await run()
    } catch (error) {
      console.log(error)
      process.exit(1)
    }
    process.exit(0)
  })()