const readline = require('node:readline');
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
})

const hre = require("hardhat");
const ethers = hre.ethers
const fs = require('fs')

const provider = new ethers.providers.Web3Provider(hre.network.provider)
const BigNumber = ethers.BigNumber

const { decimals, file } = require('../utils')
const { d, displayToWei } = decimals

// send ERC20 from one address to another inside the seed

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
  const contract = new ethers.Contract(aTokenAddress, abi, provider)

  const [owner, controller, minter, recipient] = await ethers.getSigners()
  const balOwner = await contract.balanceOf(owner.address)
  const balController = await contract.balanceOf(controller.address)
  const balMinter = await contract.balanceOf(minter.address)
  const balRecipient = await contract.balanceOf(recipient.address)

  console.log('COCO Balances')
  console.log('  Owner:'.padEnd(14) + d(balOwner.toString(), 18))
  console.log('  Controller:'.padEnd(14) + d(balController.toString(), 18))
  console.log('  Minter:'.padEnd(14) + d(balMinter.toString(), 18))
  console.log('  Recipient:'.padEnd(14) + d(balRecipient.toString(), 18))

  const addresses = ['', owner, controller, minter, recipient]
  const fromIndex = await getAnswer('Send From: (Numeric) \n  1. Owner \n  2. Controller \n  3. Minter \n  4. Recipient')
  const toIndex = await getAnswer('Send To: (Numeric) \n  1. Owner \n  2. Controller \n  3. Minter \n  4. Recipient')
  const value = await getAnswer('Amount to send (in decimal form)')

  const message = 'Send: ' + value + ' COCO, from: ' + addresses[Number(fromIndex)].address + ' to ' + addresses[Number(toIndex)].address + ' ?  (y)'
  const execute = await getAnswer(message)
  if (execute !== 'y') {
    console.log('Operation Cancelled')
    process.exit()
  }

  console.log('Broadcasting Transaction, please wait...')
  const tx = await contract.connect(addresses[Number(fromIndex)]).transfer(addresses[Number(toIndex)].address, ethers.utils.parseEther(value))
  const receipt = await tx.wait()
  console.log(receipt)

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