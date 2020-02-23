/*Copyright 2019 Kirk McDonald

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.*/
import { Rational, zero, one } from "./rational.js"

export class Ingredient {
    constructor(item, amount) {
        this.item = item
        this.amount = amount
    }
}

class Recipe {
    //constructor(key, name, category, time, ingredients, product, byproduct) {
    constructor(key, name, category, time, ingredients, product) {
        this.key = key
        this.name = name
        this.category = category
        this.time = time
        this.ingredients = ingredients
        for (let ing of ingredients) {
            ing.item.addUse(this)
        }
        this.product = product
        product.item.addRecipe(this)
		//this.byproduct = byproduct
		//byproduct.item.addByproduct(this)
    }
    gives(item) {
        if (this.product.item === item) {
            return this.product.amount
        }
        return null
    }
    //byproduct(item) {
    //    if (this.byproduct.item === item) {
    //        return this.byproduct.amount
    //    }
    //    return null
    //}
    iconPath() {
        return this.product.item.iconPath()
    }
}

function makeRecipe(data, items, d) {
    let time = Rational.from_float(d.time)
    let [item_key, amount] = d.product
    let [byproduct_key, byproduct_amount] = d.byproduct
    let item = items.get(item_key)
	let byproduct_item = items.get(byproduct_key)
    let product = new Ingredient(item, Rational.from_float(amount))
	let byproduct = new Ingredient(byproduct_item, Rational.from_float(byproduct_amount))
    let ingredients = []
    for (let [item_key, amount] of d.ingredients) {
        let item = items.get(item_key)
        ingredients.push(new Ingredient(item, Rational.from_float(amount)))
    }
//    return new Recipe(d.key_name, d.name, d.category, time, ingredients, product, byproduct)
    return new Recipe(d.key_name, d.name, d.category, time, ingredients, product)
}

class ResourceRecipe extends Recipe {
    constructor(item, category) {
        //super(item.key, item.name, category, zero, [], new Ingredient(item, one), new Ingredient(item, one))
        super(item.key, item.name, category, zero, [], new Ingredient(item, one))
    }
}

export function getRecipes(data, items) {
    let recipes = new Map()
    for (let d of data.resources) {
        let item = items.get(d.key_name)
        recipes.set(d.key_name, new ResourceRecipe(item, d.category))
    }
    for (let d of data.recipes) {
        recipes.set(d.key_name, makeRecipe(data, items, d))
    }
    for (let [itemKey, item] of items) {
        if (item.recipes.length === 0) {
            recipes.set(itemKey, new ResourceRecipe(item, null))
        }
    }
    return recipes
}
