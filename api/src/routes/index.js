const router = require("express").Router()

const routes = [
    {name: "/auth", file: require("./v1/auth.route")}
]

routes.forEach(({name, file}) =>{
    router.use(name, file)
})

module.exports = router