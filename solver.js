/*Copyright 2021 Tade Barthler

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.*/
import { one, zero } from "./rational.js"
import { gauss } from "./third_party/gaussRat.js"
import { Matrix } from "./matrix.js"

// var gauss = require('./third_party/gauss');


export class Solver {
    constructor() {
        this.matrix = new Matrix()
        this.solution = []
        this.recipeIndices = new Map()
        this.productIndices = new Map()
        this.recipes = new Set()
    }

    getItemIndex(item) {
        if (!this.productIndices.has(item)) {
            this.solution.push(zero)
            this.matrix.pushRow(this.matrix.getNewRow(zero))
            if(this.productIndices.size == 0){
                this.productIndices.set(item, 0)
            }else{
                this.productIndices.set(item, this.solution.length - 1)
            }
        }
        return this.productIndices.get(item)
    }

    getRecipeIndex(recipe) {
        if (!this.recipeIndices.has(recipe)) {
            if(this.recipeIndices.size == 0){
                this.recipeIndices.set(recipe, 0)
            }else{
                this.matrix.pushColumn(this.matrix.getNewColumn(zero))
                this.recipeIndices.set(recipe, this.matrix.size()[1] - 1)
            }
        }
        return this.recipeIndices.get(recipe)
    }

    addWanted(item, rate) {
        let rowIdx = this.getItemIndex(item)
        this.solution[rowIdx] = this.solution[rowIdx].add(rate)
    }

    addRequirement(item, recipe, rate) {
        let rowIdx = this.getItemIndex(item)
        let colIdx = this.getRecipeIndex(recipe)
        this.matrix.data[rowIdx][colIdx] = this.matrix.data[rowIdx][colIdx].sub(rate)
    }

    addProduct(item, recipe, rate) {
        let rowIdx = this.getItemIndex(item)
        let colIdx = this.getRecipeIndex(recipe)
        this.matrix.data[rowIdx][colIdx] = this.matrix.data[rowIdx][colIdx].add(rate)
    }

    addRecipe(recipe){
        this.recipes.add(recipe)
    }

    calculate() {
        if(this.matrix.size()[0] > this.matrix.size()[1]){
            //System is overdetermined look for row with byproducts
            for(let j = 0; j < this.matrix.data.length; j++){
                if(!this.solution[j].isZero()) continue
                let cntGTzero = 0
                let cntLTzero = 0
                for(let item of this.matrix.data[j]){
                    if(zero.less(item)){
                        cntGTzero++
                    }else if(item.less(zero)){
                        cntLTzero++
                    }
                }
                if(cntGTzero == 0 || cntLTzero == 0){
                    // Insert new Variable for byproduct
                    let newColumn = this.matrix.getNewColumn(zero)
                    newColumn[j] = one
                    this.matrix.pushColumn(newColumn)
                }
            }
        }

        let result = gauss(this.matrix.data, this.solution)
        let factoryFactors = new Map()
        this.recipeIndices.forEach((idx, recipe) => factoryFactors.set(recipe, result[idx].less(zero) ? zero : result[idx]))
        return factoryFactors
    }
}
