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

  const network = process.env.HARDHAT_NETWORK
  if (typeof (network) === 'undefined') {
    console.log("Try: npx hardhat run --network <network> filepath")
    process.exit(1);
  }

  if (network !== 'hardhat' && network !== 'mainnet' && network !== 'goerli' && network !== 'sepolia') {
    console.log("Unsupported Network");
    process.exit(1);
  }

  const [owner] = await ethers.getSigners()

  console.log("\nThe current deployer address is: " + owner.address)
  console.log("The current network to deploy on is: " + network)
  const balance = await ethers.provider.getBalance(owner.address)
  console.log('Deployer ETH balance: ' + d(balance, 18))

  console.log()
  const data = await file.readFile(__dirname + '/' + network + '/1.json')
  if (typeof data === 'undefined') {
    console.log('unable to find implementation on network: ' + network)
    process.exit(1)
  }
  const contractAddress = JSON.parse(data).contract
  console.log('Contract was deployed to ' + contractAddress + ' on network: ' + network)

  const Contract = await hre.ethers.getContractFactory("AiCoco")
  const contract = await Contract.attach(contractAddress)
  
  console.log('The contract name is: ' + await contract.name())
  console.log('The contract symbol is: ' + await contract.symbol())
  console.log('The contract owner is: ' + await contract.owner())
  console.log('The controller address is: ' + await contract.controllerAddress())
  console.log('The tokenCounter is: ' + await contract.tokenCounter())
  console.log('The totalSupply is: ' + await contract.totalSupply())
  console.log('The contractURI is: ' + await contract.contractURI())
  console.log('Public Minting is open: ' + await contract.publicMintOpen())
  console.log('Does this contract support rarible? ', await contract.supportsInterface('0xcad96cca'))
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