const env = require('node-env-file')
env(__dirname + '/../.env')

const fs = require('fs')
const ethers = require('ethers')
const readline = require('node:readline');
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
})


const run = async () => {
  
  // Set the contract URI

  const network = await getAnswer('Network (mainnet or goerli)')
  let provider
  let aiCocoAddress

  const data = await fs.readFileSync(__dirname + '/' + network + '/1.json')
  if (typeof data === 'undefined') {
    console.log('unable to find implementation on network: ' + network)
    process.exit(1)
  }
  aiCocoAddress = JSON.parse(data).contract

  if (network === 'mainnet') {
    provider = new ethers.providers.JsonRpcProvider(process.env.MAINNET_URL, 1)
  } else if (network === 'goerli') {
    provider = new ethers.providers.JsonRpcProvider(process.env.GOERLI_URL, 5)
  } else {
    console.log('network ' + network + ' not supported')
    process.exit()
  }
  console.log('Using network: ' + network)
  const cocoAbi = require('../artifacts/contracts/AiCoco.sol/AiCoco.json').abi // Note must update this file for every build
  console.log('Contract Address:' + aiCocoAddress)
  const aiCocoContract = new ethers.Contract(aiCocoAddress, cocoAbi, provider)
  const uri = await getAnswer('Enter contract URI, this is the CID + the ipfs gateway, eg. https://gateway.pinata.cloud/ipfs/12345')
  try {
    const controllerIndex = 1
    const signer = ethers.Wallet.fromMnemonic(process.env.MNEMONIC, `m/44'/60'/0'/0/${controllerIndex}`).connect(provider)
    console.log('Broadcasting Transaction...')
    const tx = await aiCocoContract.connect(signer).updateContractUri(uri)
    const r = await tx.wait()
    displayEthReceipt(r, 'Set contract URI')
  } catch (error) {
    console.log(error)
    console.log('Operation failed')
    process.exit(1)
  }
  console.log('Operation Completed')
  process.exit(0)

}

const displayEthReceipt = (receipt, title) => {
  console.log('########## Ethereum Receipt: ' + title + ' ##########')
  console.log('hash:'.padEnd(25) + receipt.transactionHash)
  console.log('from:'.padEnd(25) + receipt.from)
  console.log('to:'.padEnd(25) + receipt.to)
  console.log('blockHash:'.padEnd(25) + receipt.blockHash)
  console.log('blockNumber:'.padEnd(25) + receipt.blockNumber)
  console.log('status:'.padEnd(25) + receipt.status)
  console.log()
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
      process.exit()
    }
  })()
