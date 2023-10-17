const readline = require('node:readline');
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
})

const hre = require("hardhat");
const ethers = hre.ethers

const provider = new ethers.providers.Web3Provider(hre.network.provider)
const BigNumber = ethers.BigNumber

const { decimals, file } = require('../utils')
const { d, displayToWei } = decimals

// Send eth from one address to another inside the seed.

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

  const [owner, controller, minter, recipient] = await ethers.getSigners()
  const balOwner = await provider.getBalance(owner.address)
  const balController = await provider.getBalance(controller.address)
  const balMinter = await provider.getBalance(minter.address)
  const balRecipient = await provider.getBalance(recipient.address)

  console.log('ETH Balances')
  console.log('  Owner:'.padEnd(14) + d(balOwner.toString(), 18))
  console.log('  Controller:'.padEnd(14) + d(balController.toString(), 18))
  console.log('  Minter:'.padEnd(14) + d(balMinter.toString(), 18))
  console.log('  Recipient:'.padEnd(14) + d(balRecipient.toString(), 18))

  const addresses = ['', owner, controller, minter, recipient]
  const fromIndex = await getAnswer('Send From: (Numeric) \n  1. Owner \n  2. Controller \n  3. Minter \n  4. Recipient')
  const toIndex = await getAnswer('Send To: (Numeric) \n  1. Owner \n  2. Controller \n  3. Minter \n  4. Recipient')
  const value = await getAnswer('Amount to send (in decimal form)')

  const message = 'Send: ' + value + ' ETH, from: ' + addresses[Number(fromIndex)].address + ' to ' + addresses[Number(toIndex)].address + ' ?  (y)'
  const execute = await getAnswer(message)
  if (execute !== 'y') {
    console.log('Operation Cancelled')
    process.exit()
  }
  let tx0 = {
    to: addresses[Number(toIndex)].address,
    value: ethers.utils.parseEther(value)
  }
  console.log('Broadcasting Transaction, please wait...')
  const tx = await addresses[Number(fromIndex)].sendTransaction(tx0)
  const receipt = await tx.wait()
  console.log(receipt)

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