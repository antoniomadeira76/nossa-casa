/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_2050313079")

  // update collection data
  unmarshal({
    "createRule": "@request.auth.papel = \"admin\" && casa = @request.auth.casa"
  }, collection)

  // add field
  collection.fields.addAt(11, new Field({
    "help": "",
    "hidden": false,
    "id": "bool2559765639",
    "name": "fem",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "bool"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_2050313079")

  // update collection data
  unmarshal({
    "createRule": null
  }, collection)

  // remove field
  collection.fields.removeById("bool2559765639")

  return app.save(collection)
})
