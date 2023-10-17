const readline = require('node:readline');
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
})

const fs = require('fs')
const hre = require("hardhat");
const ethers = hre.ethers

const provider = new ethers.providers.Web3Provider(hre.network.provider)
const BigNumber = ethers.BigNumber

const { decimals, file } = require('../utils')
const { d, displayToWei } = decimals

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

  // the address and contract of coco
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
  const abiPath = __dirname + '/../artifacts/contracts/AToken.sol/AToken.json'
  if (!fs.existsSync(abiPath)) {
    console.log('Couldnt locate the abi for the token: ' + abiPath)
  }
  const abiInfo = fs.readFileSync(abiPath, 'utf8')
  const abi = JSON.parse(abiInfo).abi
  const cocoContract = new ethers.Contract(aTokenAddress, abi, provider)

  // the address and contract of AiCoco
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
  if (!mintingOpen) {
    console.log('Cannot Proceed, minting has not been enabled...')
    process.exit
  }

  // Now that the contracts have been established lets mint some tokens!

  const [owner, controller, minter] = await ethers.getSigners()

  console.log('This script is called from the perspective of the minter.')
  console.log("\nThe minter address is: " + minter.address);
  console.log("The current network to broadcast on is: " + network)
  const balance = await provider.getBalance(minter.address)
  console.log('minter ETH balance: ' + d(balance, 18))

  const tokenBalance = await cocoContract.balanceOf(minter.address)
  console.log('minter COCO balance: ' + d(tokenBalance.toString(), 18))

  // NOTE: In order to mint a new token the cid must already be set
  // check that minter balance is greater than price
  // check that contract allowance needs approval tx

  let counter = await contract.tokenCounter()

  const answer = await getAnswer('Mint token?? (y n)')
  if (answer !== 'y') {
    console.log('Operation Cancelled')
    process.exit()
  }

  // get nft price and approve contract for that amount
  const price = await contract.pricePerNft()
  const tx1 = await cocoContract.connect(minter).approve(contract.address, price)
  console.log('Broadcasting Approval Transaction, standby...')
  const r = await tx1.wait()
  console.log(r)

  console.log('Broadcasting Minting Transaction, standby...')
  const tx = await contract.connect(minter).publicMint()
  const receipt = await tx.wait()
  console.log(receipt)
  console.log('A token was minted.')
  counter = await contract.tokenCounter()

  const nftBalance = await contract.balanceOf(minter.address)
  console.log('Minter posesses: ' + nftBalance.toString() + ' NFTs')

  const cocoBalance = await cocoContract.balanceOf(minter.address)
  console.log('Minter Coco Balance: ' + d(cocoBalance.toString(), 18))

  const burnAddress = '0x000000000000000000000000000000000000dEaD'
  const burnBalance = await cocoContract.balanceOf(burnAddress)
  console.log('Burn Address Coco Balance: ' + d(burnBalance.toString(), 18))

  const burned = await contract.totalBurned()
  console.log('Total this contract has burned: ' + d(burned.toString(), 18))
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