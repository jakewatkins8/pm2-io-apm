/** NOTICE: 
As per this project's license, the following source file has been modified from its original content as part of this fork repository. 
*/
import PMX from './pmx'

const yargs = require('yargs')
const tag = require('crypto').randomBytes(3).toString('hex')
const log = (...args) => {}
// console.log(`[src/index](${tag})`, ...args)

console.log('main Module:', process.mainModule)
console.log('process argv:', process.argv)


const callingModulePath = String(process.mainModule?.['path'])

// log('pid', process.pid, '- main module\'s path:', callingModulePath)

// System will be windows...so...
const pathSeparator = process.platform === 'win32' ? '\\' : '/'
// console.log('Using pathSeparator:', pathSeparator)

const callingModulePathPortions = callingModulePath.split(pathSeparator)
// console.log('callingModulePathPortions:', callingModulePathPortions)

// TODO - Not great - or make ROOT_DIR a definable .env entry?
const rootDirPortionIndex = callingModulePathPortions?.findIndex(portion => portion === 'indd-server')
// console.log('rootDirPortionIndex:', rootDirPortionIndex)
// where the module dir (i.e. module name) is at [..., 'indd-server', '/', '<module_name>, ...]
const moduleDir = rootDirPortionIndex >= 0 ? (callingModulePathPortions?.[rootDirPortionIndex + 1] || undefined) : undefined
// console.log('moduleDir:', moduleDir)
// given that process.mainModule will contain paths like:
// path: <REDACTED>,
// work backwards to 'indd-server' and get the app's "name"
// TODO - find a better way than this...
// It's a matter of not disrupting the app's startup flow, but still making it identifiable.
const callingAppName = moduleDir || undefined

if (callingAppName) {
    // log('Identified calling app as:', callingAppName)
}




// Special case for monitor app?
let monitorTarget;
if (callingAppName === 'monitor') {
    // Maybe this shouldn't live in this package. Not sure yet.
    monitorTarget = process.argv[2]?.startsWith('target=') ? process.argv[2]?.substring(7) : undefined
    // console.log('Got target for monitor as', monitorTarget)
}
const monitorAppName = monitorTarget ? `monitor:${monitorTarget}` : undefined

// If a --pm2Tag flag with a value was passed, we will use that as the app's name. This is the preferred way, to avoid naming conflicts.
const yargv = yargs(process.argv.slice(2)).options({
    pm2Tag: { type: 'string' }
}).parseSync();

const pm2AppName = yargv.pm2Tag || undefined

if (pm2AppName) {
    console.log('Got a --pm2Tag value of:', pm2AppName, '- will use this name to link the app to PM2.io')
} else {
    console.log('WARNING - Could not get a --pm2Tag value - will now be using the following name to link this app to PM2.io:', monitorAppName || callingAppName)
}


const IO_KEY = Symbol.for('@pm2/io')
// log(' - global IO_KEY:', IO_KEY)
const isAlreadyHere = (Object.getOwnPropertySymbols(global).indexOf(IO_KEY) > -1)

// log(' - isAlreadyHere:', isAlreadyHere)
const io: PMX = isAlreadyHere ? global[IO_KEY] as PMX : new PMX({ xAppName: pm2AppName || monitorAppName || callingAppName, nameTag: tag }).init()
// log(' - Value of io:', io)
global[IO_KEY] = io


// log(' - Value of global[IO_KEY]:', global[IO_KEY])

export = io
