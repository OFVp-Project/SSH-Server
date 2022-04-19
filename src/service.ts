import fs from "fs";
import path from "path";
import child_process from "child_process";

export async function StartSshd (Loaddeds_Keys=false) {
  if (!(fs.existsSync("/run/sshd"))) fs.mkdirSync("/run/sshd");
  // Write SSH Config
  fs.writeFileSync("/etc/ssh/sshd_config", ([
    `Banner ${path.resolve(__dirname, "./banner.html")}`,
    "PasswordAuthentication yes",
    "PermitRootLogin no",
    "ChallengeResponseAuthentication no",
    "Include /etc/ssh/sshd_config.d/*.conf",
    "UsePAM yes",
    "X11Forwarding no",
    "PrintMotd yes",
    "AcceptEnv LANG LC_*",
    "",
    "# Ports",
    "",
    "Port 22"
  ]).join("\n"));

  // Copy or Create ssh host keys
  if (Loaddeds_Keys) {
    const KeysStoragePath = "/data";
    if (fs.readdirSync(KeysStoragePath).filter(file => file.includes("ssh_host_")).length === 0) {
      console.log("SSH Host Keys Found, Creating New Keys");
      child_process.execSync("dpkg-reconfigure openssh-server &> /dev/null");
      fs.readdirSync("/etc/ssh").filter(file => file.includes("ssh_host_")).map(KeyFile => path.join("/etc/ssh/", KeyFile)).forEach(KeyFile => fs.copyFileSync(KeyFile, path.join(KeysStoragePath, path.basename(KeyFile))));
    } else {
      console.log("Copying SSH Host Keys");
      fs.readdirSync(KeysStoragePath).filter(Key => Key.includes("ssh_host_")).map(Key => path.join(KeysStoragePath, Key)).forEach(KeyFile => {
        const KeyFileOut = path.join("/etc/ssh", path.basename(KeyFile));
        fs.copyFileSync(KeyFile, KeyFileOut);
        child_process.execFileSync("chmod", ["0600", "-v", KeyFileOut], {stdio: "ignore"});
      });
    }
  }
  const SSHProcess = child_process.exec("/usr/sbin/sshd -D -d -f /etc/ssh/sshd_config", {maxBuffer: Infinity});
  SSHProcess.on("exit", code => code !== 0 ? StartSshd():null);
  const logFile = fs.createWriteStream(`/tmp/sshd_${(new Date()).toString().replace(/[-\(\)\:\s+]/gi, "_")}.log`, {flags: "a"});
  SSHProcess.stdout.pipe(logFile);
  SSHProcess.stderr.pipe(logFile);
  return;
}