enum CfgItem {
  Vid = 0x3701,
  Pid = 0x3702,
  Name = 0x3703,
  Serial = 0x3704,
  Flush = 0x370d,
  Mode = 0x3711
}

export interface CP210XOptions {
  vid?: number
  pid?: number
  name?: string
  serial?: string
  flush?: number
  mode?: number
}

export class CP210XDevice {
  #device: USBDevice

  constructor(
    device: USBDevice
  ) {
    this.#device = device
  }

  #encodeDescriptorString(str: string) {
    const len = str.length
    if (len > 126) {
      throw new Error("Descriptor string is too long")
    }
  
    const out = new Uint8Array(256)
    out[0] = len * 2 + 2
    out[1] = 0x03
  
    for (let i = 0, o = 2; i < len; ++i, o += 2) {
      if (str.charCodeAt(i) & 0x80) {
        throw new Error("Only ASCII descriptor strings supported")
      }
  
      out[o] = str.charCodeAt(i)
      out[o + 1] = 0
    }
  
    return out
  }

  async #setCfg(itemNumber: CfgItem, index: number, data?: BufferSource) {
    const result = await this.#device.controlTransferOut({
      requestType: "vendor",
      recipient: "device",
      request: 0xFF,
      value: itemNumber,
      index
    }, data)

    if (result.status !== "ok") {
      throw new Error(`Failed to write config item (status: ${result.status}, bytes written: ${result.bytesWritten})`)
    }

    return result
  }

  async configure(options: CP210XOptions) {
    let closeAfterDone = false
    if (!this.#device.opened) {
      closeAfterDone = true
      await this.#device.open()
    }

    const { vid, pid, name, serial, flush, mode } = options

    if (vid !== undefined) {
      await this.setVid(vid)
    }

    if (pid !== undefined) {
      await this.setPid(pid)
    }

    if (name !== undefined) {
      await this.setName(name)
    }

    if (serial !== undefined) {
      await this.setSerial(serial)
    }

    if (flush !== undefined) {
      await this.setFlush(flush)
    }

    if (mode !== undefined) {
      await this.setMode(mode)
    }

    await this.#device.reset()

    if (closeAfterDone) {
      await this.#device.close()
    }
  }

  setVid(vid: number) {
    return this.#setCfg(CfgItem.Vid, vid)
  }

  setPid(pid: number) {
    return this.#setCfg(CfgItem.Pid, pid)
  }

  setFlush(flush: number) {
    if (flush > 0xFF || flush < 0) {
      throw new Error("Flush value must be unsigned 8 bit")
    }

    return this.#setCfg(CfgItem.Flush, 0, new Uint8Array([flush]))
  }

  setMode(mode: number) {
    if (mode > 0xFFFF || mode < 0) {
      throw new Error("Mode value must be unsigned 16 bit")
    }

    return this.#setCfg(CfgItem.Mode, 0, new Uint8Array([
      ((mode >> 8) & 0xFF),
      mode & 0xFF
    ]))
  }

  setName(name: string) {
    return this.#setCfg(CfgItem.Name, 0, this.#encodeDescriptorString(name))
  }
  
  setSerial(serial: string) {
    const encodedSerial = this.#encodeDescriptorString(serial)
    if (encodedSerial[0]! > 128) {
      throw new Error("Serial string is too long")
    }

    return this.#setCfg(CfgItem.Serial, 0, encodedSerial)
  }
}

export async function requestCP210XDevice() {
  const filters = [
    { vendorId: 0x10C4, productId: 0xEA60 },
    { vendorId: 0x10C4, productId: 0xEA70 }
  ]

  const device = await navigator.usb.requestDevice({ filters })
  return new CP210XDevice(device)
}
