const readline = require('node:readline');
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
})

const hre = require("hardhat");
const ethers = hre.ethers

const { decimals, file } = require('../utils')
const { d } = decimals

// Deploy A Token, ERC20 copy
// npx hardhat run --network sepolia scripts/U_ERC20.js

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

  console.log("\nThe current deployer address is: " + owner.address)
  console.log("The current network to deploy on is: " + network)

  const balance = await ethers.provider.getBalance(owner.address)
  if (Number(balance) < 100) {
    console.log('ETH Balance for ' + owner.address + ' is insufficient: ' + Number(balance))
    process.exit(1)
  }
  console.log('Deployer ETH balance: ' + d(balance, 18))

  const exists = await file.fileExists(__dirname + '/' + network)
  if (!exists) {
    console.log('Cannot find the directory to store the contract address at: ' + __dirname + '/' + network)
    process.exit()
  }

  const answer = await getAnswer('Check these settings. Continue? (y n)')
  if (answer !== 'y') {
    console.log('Operation Canceled')
    process.exit(1)
  }

  const parameters = [
    ethers.BigNumber.from('420690000000000000000000000000000')
  ]
  const Contract = await hre.ethers.getContractFactory("AToken");
  const contract = await Contract.deploy(...parameters);
  await contract.deployed();
  contractAddress = contract.address
  console.log("AToken contract deployed to: " + contractAddress + ' on ' + network)
  await file.writeFile(__dirname + '/' + network + '/A.json', JSON.stringify({ contract: contractAddress }, null, 4))
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