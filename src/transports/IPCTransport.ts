import { Transport, TransportConfig } from '../services/transport'
import { Action } from '../services/actions'
import { InternalMetric } from '../services/metrics'
import { EventEmitter2 } from 'eventemitter2'
import * as cluster from 'cluster'

import { config as configDotEnv } from 'dotenv'

configDotEnv()
// console.log('process.env.PM2_SECRET_KEY && process.env.PM2_PUBLIC_KEY && process.env.PM2_APP_NAME:',
//   [process.env.PM2_SECRET_KEY, process.env.PM2_PUBLIC_KEY, process.env.PM2_APP_NAME])

export class IPCTransport extends EventEmitter2 implements Transport {

  private initiated: Boolean = false // tslint:disable-line
  private logger: Function = (...args) => {}
  // Debug('axm:transport:ipc')
  // console.log('[IPCTransport]', ...args)
  // Debug('axm:transport:ipc')
  private onMessage: any | undefined
  private autoExitHandle: NodeJS.Timer | undefined

  init(config?: TransportConfig): Transport {
    // this.logger('Init new transport service')
    if (this.initiated === true) {
      console.error(`Trying to re-init the transport, please avoid`)
      return this
    }
    this.initiated = true
    this.logger('Agent launched')
    this.onMessage = (data?: Object) => {
      // this.logger(`Received reverse message from IPC`)
      this.emit('data', data)
    }
    process.on('message', this.onMessage)

    // if the process is standalone, the fact that there is a listener attached
    // forbid the event loop to exit when there are no other task there
    if (cluster.isWorker === false) {
      this.autoExitHook()
    }
    return this
  }

  private autoExitHook() {
    // clean listener if event loop is empty
    // important to ensure apm will not prevent application to stop
    this.autoExitHandle = setInterval(() => {
      let currentProcess: any = (cluster.isWorker) ? cluster.worker.process : process

      if (currentProcess._getActiveHandles().length === 3) {
        let handlers: any = currentProcess._getActiveHandles().map(h => h.constructor.name)

        if (handlers.includes('Pipe') === true &&
          handlers.includes('Socket') === true) {
          process.removeListener('message', this.onMessage)
          let tmp = setTimeout(_ => {
            this.logger(`Still alive, listen back to IPC`)
            process.on('message', this.onMessage)
          }, 200)
          tmp.unref()
        }
      }
    }, 3000)

    this.autoExitHandle.unref()
  }

  setMetrics(metrics: InternalMetric[]) {
    const serializedMetric = metrics.reduce((object, metric: InternalMetric) => {
      if (typeof metric.name !== 'string') return object
      object[metric.name] = {
        historic: metric.historic,
        unit: metric.unit,
        type: metric.id,
        value: metric.value
      }
      return object
    }, {})
    this.send('axm:monitor', serializedMetric)
  }

  addAction(action: Action) {
    this.logger(`Add action: ${action.name}:${action.type}`)
    this.send('axm:action', {
      action_name: action.name,
      action_type: action.type,
      arity: action.arity,
      opts: action.opts
    })
  }

  setOptions(options) {
    this.logger(`Set options: [${Object.keys(options).join(',')}]`)
    return this.send('axm:option:configuration', options)
  }

  send(channel, payload) {
    // console.log('In send fn for transport with following channel and payload. Channel:', channel, 'payload:', String(payload || '').substring(0, 50) + '...')


    // child_process?
    // console.log(process.parent)

    if (typeof process.send !== 'function') {
      // const resultMsg = ['[FAILURE]', channel, String(payload || '').substring(0, 50) + '...', '- typeof process.send !== function - returning -1 for send'].join(', ')
      // console.log('[FAILURE]', channel, String(payload || '').substring(0, 50) + '...', '- typeof process.send !== function - returning -1 for send')
      // console.log('[FAILURE] process info:')
      // try {
      //   console.log(JSON.stringify(process))
      // }
      // catch (error) {
      //   console.log('cannot stringify - instead:')
      //   const { argv, connected, cwd, pid, ppid } = process || {}
      //   console.log({
      //     ...{ _debug: resultMsg }, ...{
      //       argv, connected, cwd, env: '(not logged)', pid, ppid, mainModule: '(not logged)'
      //     }
      //   })
      return -1
    }
    if (process.connected === false) {
      console.error('Process disconnected from parent! (not connected)')
      return process.exit(1)
    }

    try {

      // if (channel === 'process:exception') {
      //   console.log('!!!! - in send fn, trying to send a process exception.')
      // }
      process.send({ type: channel, data: payload })
      const resultMsg = ['[SUCCESS] sent process.send(', {
        type: channel,
        // data: JSON.stringify(payload).substring(0, 50) + '(...)' 
      }, ')'].join(', ')
      // console.log(resultMsg)
      // try {
      //   console.log('[SUCCESS] process info:')
      //   console.log(JSON.stringify(process))
      // }
      // catch (error) {
      //   console.log('cannot stringify - instead:')
      //   const { argv, connected, cwd, pid, ppid } = process || {}
      //   console.log({
      //     ...{ _debug: resultMsg }, ...{
      //       argv, connected, cwd, env: '(not logged)', pid, ppid, mainModule: '(not logged)'
      //     }
      //   })
      // }
      // console.log('process.argv:', process.argv)
    } catch (err) {
      this.logger('Process disconnected from parent !')
      this.logger(err)
      return process.exit(1)
    }
  }
  // }

  destroy() {
    if (this.onMessage !== undefined) {
      process.removeListener('message', this.onMessage)
    }
    if (this.autoExitHandle !== undefined) {
      clearInterval(this.autoExitHandle)
    }
    this.logger('destroy')
  }
}
