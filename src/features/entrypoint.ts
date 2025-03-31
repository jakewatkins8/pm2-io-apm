/** NOTICE: 
As per this project's license, the following source file has been modified from its original content as part of this fork repository. 
*/
import IO, { IOConfig } from '../pmx'
const IO_KEY = Symbol.for('@pm2/io')

// console.log('IO_KEY:', IO_KEY)
// console.log(IO_KEY)

export class Entrypoint {
  private io: IO

  constructor () {
    try {
      this.io = global[IO_KEY].init(this.conf())

      this.onStart(err => {
        if (err) {
          console.error(err)
          process.exit(1)
        }

        this.sensors()
        this.events()
        this.actuators()

        this.io.onExit((code, signal) => {
          this.onStop(err, () => {
            this.io.destroy()
          }, code, signal)
        })

        if (process && process.send) {

          // console.log('in pm2-io-apm entrypoint constructor - about to send process "ready"')

          process.send('ready')
        }
      })
    } catch (e) {
      // properly exit in case onStart/onStop method has not been override
      if (this.io) {
        this.io.destroy()
      }

      throw (e)
    }
  }

  events () {
    return
  }

  sensors () {
    return
  }

  actuators () {
    return
  }

  onStart (cb: Function) {
    throw new Error('Entrypoint onStart() not specified')
  }

  onStop (err: Error, cb: Function, code: number, signal: string) {
    return cb()
  }

  conf (): IOConfig | undefined {
    // console.log('in this.conf() - about to return undefined?')
    return undefined
  }
}
