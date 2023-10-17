const readline = require('node:readline');
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
})

const hre = require("hardhat");
const ethers = hre.ethers

const cids1 = require('../../assets/metadata/cids1.json')
const cids2 = require('../../assets/metadata/cids2.json')

const { decimals, file } = require('../utils')
const { d } = decimals

const run = async () => {

  const network = process.env.HARDHAT_NETWORK
  if (typeof (network) === 'undefined') {
    console.log("Try: npx hardhat run --network <network> filepath");
    process.exit(1);
  }

  if (network !== 'hardhat' && network !== 'mainnet' && network !== 'goerli' && network !== 'sepolia') {
    console.log("Unsupported Network");
    process.exit(1);
  }

  const [owner, controller] = await ethers.getSigners()
  console.log('This script is called from the perspective of the controller.')
  console.log("\nThe current controller address is: " + controller.address);
  console.log("The current network to deploy on is: " + network)

  const balance = await ethers.provider.getBalance(controller.address)
  console.log('controller ETH balance: ' + d(balance, 18))
  if (Number(balance) < 100) {
    console.log('ETH Balance for ' + controller.address + ' is insufficient: ' + Number(balance))
    process.exit(1)
  }

  // read from a file to get deployed contract address
  console.log()
  const data = await file.readFile(__dirname + '/' + network + '/1.json')
  if (typeof data === 'undefined') {
    console.log('unable to find implementation on network: ' + network)
    process.exit(1)
  }
  const contractAddress = JSON.parse(data).contract
  console.log('Contract was deployed to ' + contractAddress + ' on network: ' + network)

  const Contract = await hre.ethers.getContractFactory("AiCoco");
  const contract = await Contract.attach(contractAddress);

  const currentController = await contract.controllerAddress()
  if (controller.address !== currentController) {
    console.log('Signing wallet is not the registered controller!')
    console.log('registered controller: ' + currentController + ' signing address: ' +  controller.address)
  }

  const answer = await getAnswer('Set Cids for tokens?? (y n)')
  if (answer !== 'y') {
    console.log('Operation Canceled')
    process.exit(1)
  }
  
  console.log('Broadcasting transactions please wait...')
  const tx1 = await contract.connect(controller).setCids(cids1)
  const receipt1 = await tx1.wait()
  console.log(receipt1)
  console.log('Cids 1 was set.')

  // const tx2 = await contract.connect(controller).setCids(cids2)
  // const receipt2 = await tx2.wait()
  // console.log(receipt2)
  // console.log('Cids 2 was set.')
  // note you cant read cid until a token has been minted, the only way 
  // is to extract data from the transcations above and decode 

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