# Testing on an Android phone

Open the local dev server on a phone as `http://localhost:3000`, over Wi-Fi, with no code changes.

Use `adb reverse` rather than the Mac's LAN IP. The barcode scanner needs a secure context for camera access, and `localhost` counts as one while `http://192.168.x.x` does not. `BETTER_AUTH_URL` is also `http://localhost:3000`, so sign-in works unchanged.

## One-time setup

1. Install adb on the Mac: `brew install android-platform-tools`.
2. On the phone, tap **Build number** seven times (Settings → About phone), then enable **Wireless debugging** (Settings → System → Developer options). The phone and Mac must be on the same Wi-Fi, and the network must allow device-to-device traffic.
3. Tap **Wireless debugging → Pair device with pairing code**. The dialog shows an `IP:port` and a six-digit code:

   ```bash
   adb pair <ip>:<pairing-port> <code>
   ```

The QR code option only works if the Mac can discover the phone over mDNS (Android Studio does this for you). With plain `adb`, use the pairing code.

## Each session

1. Start the dev server: `pnpm dev`.
2. On the **main** Wireless debugging screen, read **IP address & Port**. This is a different port from the pairing dialog, and it changes whenever Wireless debugging is toggled or the connection drops.

   ```bash
   adb connect <ip>:<port>
   adb reverse tcp:3000 tcp:3000
   ```

3. Open `http://localhost:3000` in Chrome on the phone.

Chrome's port forwarding at `chrome://inspect/#devices` does the same as `adb reverse`, and also gives you DevTools for the phone's tabs.

## Troubleshooting

- **`Connection refused`:** the port changed. Re-read it from the main Wireless debugging screen. Keep the phone awake; enabling **Stay awake** in Developer options helps.
- **Port unknown or keeps changing:** list the phone's open ports with `seq 30000 46000 | xargs -P 600 -I{} sh -c 'nc -z -G 1 <ip> {} 2>/dev/null && echo {}'` and try `adb connect` on each. Re-pairing also changes the connect port.
- **Device shows `offline`:** accept the "Allow wireless debugging on this network?" prompt on the phone, then `adb disconnect` and `adb connect` again.
- **`adb devices` is empty after a while:** the connection dropped when the phone slept or switched networks. Connect again with the current port and rerun `adb reverse`; the reverse rule is lost with the connection.
- **Page doesn't load, `adb reverse` succeeded:** the dev server may listen only on IPv6. Check with `lsof -nP -iTCP:3000 -sTCP:LISTEN`; if it shows only `[::1]`, start it with `pnpm dev --host 127.0.0.1`.
- **Phone can't be found at all:** the Wi-Fi may isolate clients. Use USB instead (`adb devices` works the same, then `adb reverse`).
- **Not on Android:** serve over HTTPS with a tunnel, for example `cloudflared tunnel --url http://localhost:3000`, and add the tunnel host to `server.allowedHosts` and the auth trusted origins.
