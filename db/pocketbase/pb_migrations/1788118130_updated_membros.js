/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_2050313079")

  // update collection data
  unmarshal({
    "oauth2": {
      "enabled": true,
      "mappedFields": {
        "name": "nome"
      }
    }
  }, collection)

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_2050313079")

  // update collection data
  unmarshal({
    "oauth2": {
      "enabled": false,
      "mappedFields": {
        "name": ""
      }
    }
  }, collection)

  return app.save(collection)
})
