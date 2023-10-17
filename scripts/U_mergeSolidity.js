
const fs = require('fs')
const { merge } = require('sol-merger')

const run = async () => {
  // Note this doesnt work for upload to etherscan, but it helps if you want to grep all the libraries
  const mergedCode = await merge('./contracts/AiCoco.sol')
  fs.writeFileSync(__dirname + '/mainnet/mergedCode.sol', mergedCode)
  console.log('Process Complete: ' + __dirname + '/mainnet/mergedCode.sol')
}

  ; (async () => {
    try {
      await run()
    } catch (error) {
      console.log(error)
    }
    process.exit()
  })()
