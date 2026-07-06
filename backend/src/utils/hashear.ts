import bcrypt from "bcryptjs"

const hash = await bcrypt.hash("122427", 10)
console.log(hash)