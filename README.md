# cp210x-webusb

This is a TypeScript library that allows you to reconfigure a CP210x USB to UART bridge chip from the browser using WebUSB. It is largely a reimplementation of [cp210x-cfg](https://github.com/DiUS/cp210x-cfg) and carries many of the same caveats.

## Usage

This module exports a `CP210XDevice` class that wraps a WebUSB `USBDevice` and provides a simple API for reconfiguring the CP210x chip.

To construct a `CP210XDevice`, you can either use an existing `USBDevice`:

```typescript
import { CP210XDevice } from "cp210x-webusb"

// Obtained elsewhere in your code
declare const device: USBDevice

const cp210x = new CP210XDevice(device)
```

Or use the exported `requestCP210XDevice` method to prompt the user to select a device. This method will filter by known VID/PID pairs for CP210x devices:

```typescript
import { requestCP210XDevice } from "cp210x-webusb"
const cp210x = await requestCP210XDevice()
```

Once you have a `CP210XDevice`, the easiest way to configure it is to use the `configure` method. It will handle opening, resetting, and closing the device for you:

```typescript
// Any options not provided will not be modified
await cp210x.configure({
  vid: 0x1234,
  pid: 0x1337,
  name: "My Device",
  serial: "12345678",
})
```

If you'd like more control over the process, you can use the individual methods directly:

```typescript
await device.open()

await cp210x.setName("My Device")

await device.reset()
await device.close()
```

## License

MIT