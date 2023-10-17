const env = require('node-env-file')
env(__dirname + '/../.env')

const { exec } = require("child_process")
const ethers = require('ethers')
const fs = require('fs')

const readline = require('node:readline');
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
})

const runCommand = (contract, network) => {
  return new Promise((resolve) => {
    exec('npx hardhat verify --network ' + network + ' --constructor-args ./scripts/' + network + '/arguments.js ' + contract, (error, stdout, stderr) => {
      if (error) { console.log(error.message) }
      if (stderr) { console.log(stderr) }
      console.log(stdout.replace(/\n*$/, ""))
      resolve()
    })
  })
}

const run = async () => {

  const contractFile = __dirname + '/' + network.name + '/1.json'
  if (!fs.existsSync(contractFile)) {
    console.log('could not locate contract deployment address file at: ' + contractFile)
    process.exit()
  }
  const conntractFileInfo = fs.readFileSync(contractFile, 'utf8')
  const contract = JSON.parse(conntractFileInfo).contract
  const baseUri = process.env.BASE_URI
  const contractUri = process.env.BASE_URI + process.env.CONTRACT_CID
  const pricePerToken = ethers.BigNumber.from('250000000000000000000000000000')

  // the address of coco
  let aTokenAddress
  if (network.name === 'mainnet') {
    aTokenAddress = '0xE6DBeAdD1823B0BCfEB27792500b71e510AF55B3'
  } else {
    const addressFileExists = await fs.existsSync(__dirname + '/' + network.name + '/A.json') // Atoken
    if (addressFileExists) {
      const _aFile = await fs.readFileSync(__dirname + '/' + network.name + '/A.json', 'utf8')
      const aFile = JSON.parse(_aFile)
      aTokenAddress = aFile.contract
    }
  }
  if (!aTokenAddress) {
    console.log('Error: Couldnt determine where the base currency contract was...')
    process.exit()
  }

  console.log('baseUri: ', baseUri)
  console.log('contractUri: ', baseUri)
  console.log('royalty perc: ', process.env.ROYALTY_PERC)
  console.log('controller: ', process.env.CONTROLLER_ADDRESS)
  console.log('pricePerToken: ', pricePerToken.toString())
  console.log('coco contract address: ', aTokenAddress)

  const answer = await getAnswer('Check these settings. Continue? (y n)')
  if (answer !== 'y') {
    console.log('Operation Canceled')
    process.exit(1)
  }

  const arguments = [
    baseUri,
    contractUri,
    process.env.ROYALTY_PERC,
    process.env.CONTROLLER_ADDRESS,
    pricePerToken,
    aTokenAddress
  ]

  let code = 'module.exports = \n'
  code += JSON.stringify(arguments, null, 4)
  code += '\n'
  await fs.writeFileSync(__dirname + '/' + network.name + '/arguments.js', code)
  await runCommand(contract, network.name)

  console.log('Operation Completed')
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

;(async () => {
  try {
    await run()
  } catch (error) {
    console.log(error)
    process.exit()
  }
})()