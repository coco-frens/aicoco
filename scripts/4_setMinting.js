const readline = require('node:readline');
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
})

const hre = require("hardhat");
const ethers = hre.ethers

const { file } = require('../utils')

const run = async () => {

  const [owner, controller, minter, recipient] = await ethers.getSigners()

  const network = process.env.HARDHAT_NETWORK
  if (typeof (network) === 'undefined') {
    console.log("Try: npx hardhat run --network <network> filepath");
    process.exit(1);
  }

  if (network !== 'hardhat' && network !== 'mainnet' && network !== 'goerli' && network !== 'sepolia') {
    console.log("Unsupported Network");
    process.exit(1);
  }

  const data = await file.readFile(__dirname + '/' + network + '/1.json')
  if (typeof data === 'undefined') {
    console.log('unable to find implementation on network: ' + network)
    process.exit(1)
  }
  const contractAddress = JSON.parse(data).contract
  console.log('Contract was deployed to ' + contractAddress + ' on network: ' + network)

  const Contract = await hre.ethers.getContractFactory("AiCoco")
  const contract = await Contract.attach(contractAddress)

  let mintingOpen = await contract.publicMintOpen()
  console.log('Public Minting is open: ' + mintingOpen)
  if (mintingOpen) {
    console.log('Minting Already Open!!')
    process.exit()
  }

  const answer = await getAnswer('Set Minting for tokens?? (y n)')
  if (answer !== 'y') {
    console.log('Operation Canceled')
    process.exit(1)
  }

  const tx = await contract.connect(controller).setMinting(true)
  console.log('Broadcasting Transaction...')
  const receipt = await tx.wait()
  console.log(receipt)
  console.log('Minting was set.')
  
  mintingOpen = await contract.publicMintOpen()
  console.log('Public Minting: ' + mintingOpen)

  process.exit()
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