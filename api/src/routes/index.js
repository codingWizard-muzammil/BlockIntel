const router = require("express").Router()

const routes = [
    {name: "/auth", file: require("./v1/auth.route")},
    {name: "/projects", file: require("./v1/project.route")},
    {name: "/contracts", file: require("./v1/contract.route")},
    {name: "/wallet", file: require("./v1/wallet.route")},
    {name: "/ai", file: require("./v1/ai.route")}
]

routes.forEach(({name, file}) =>{
    router.use(name, file)
})

module.exports = router