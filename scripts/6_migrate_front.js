// copy the abi from artifacts to the appropriate front end file
// update the contract address in frontend .env to reflect newest deploy

// Use:
// node scripts/5_etherscan.js -n goerli

const env = require('node-env-file')
env(__dirname + '/../.env')
const { file } = require('../utils')

const migrate = async (network) => {

  if (network !== 'hardhat' && network !== 'mainnet' && network !== 'goerli' && network !== 'sepolia') {
    console.log("Unsupported Network");
    process.exit(1);
  }
  
  const contractDataPath = __dirname + '/../artifacts/contracts/Mutiny.sol/Mutiny.json'
  const contractDataExists = await file.fileExists(contractDataPath)
  if (!contractDataExists) {
    console.log("Cannot find contract data");
    process.exit(1);
  }
  const contractData = JSON.parse(await file.readFile(contractDataPath))
  const abi = contractData.abi

  const deploymentPath = __dirname + '/' + network + '/1.json'
  const deploymentExists = await file.fileExists(deploymentPath)
  if (!deploymentExists) {
    console.log("Cannot find deployment data");
    process.exit(1);
  }
  const deployment = JSON.parse(await file.readFile(deploymentPath)).contract

  const abiLocation = __dirname + '/../../../frontend/src/lib/abi_' + network + '.json'
  const abiLocationExists = await file.fileExists(abiLocation)
  if (!abiLocationExists) {
    console.log("Cannot find abi location");
    process.exit(1);
  }
  await file.writeFile(abiLocation, JSON.stringify(abi, null, 4))

  const envLocation = __dirname + '/../../../frontend/.env'
  const envLocationExists = await file.fileExists(envLocation)
  if (!envLocationExists) {
    console.log("Cannot find env location");
    process.exit(1);
  }
  const envDataRaw = await file.readFile(envLocation)
  const envData = envDataRaw.split('\n')
  let newData = ''
  let found = false
  for (let i = 0; i < envData.length; i++) {
    if (envData[i].includes('REACT_APP_CONTRACT_' + network.toUpperCase())){
      found = true
      const str = 'REACT_APP_CONTRACT_' + network.toUpperCase() + '=' + deployment + '\n'
      newData += str
      console.log('updated .env: ' + envData[i] + ' -> ' + str)
    } else {
      newData += envData[i] + '\n'
    }
  }
  if (!found) {
    newData += 'REACT_APP_CONTRACT_' + network.toUpperCase() + '=' + deployment
  }
}

; (async () => {
  const args = process.argv.slice(2);
  let found = false
  for (let i = 0; i < args.length; i++) {
    if (i % 2 === 0) {
      if (args[i].toLowerCase() === '-n') {
        found = true
        if (args.length > i + 1) {
          await migrate(args[i + 1])
        }
      }
    }
  }
  if (!found) console.log('Dont use hardhat, use node.. node scripts/5_migrate_front.js -n sepolia')
  process.exit(0)
})()
