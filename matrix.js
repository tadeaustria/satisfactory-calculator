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

// var assert = require('assert');

export class Matrix {
  constructor() {
    this.data = []
  }

  size() {
    if (this.data.length == 0) {
      return [0, 0]
    }
    return [this.data.length, this.data[0].length]
  }

  insertColumn(index, ndata) {
    console.assert(ndata.length == this.data.length)
    for (var i = 0; i < ndata.length; i++) {
      this.data[i].splice(index, 0, ndata[i])
    }
  }

  insertRow(index, ndata) {
    console.assert(ndata.length == this.data[0].length)
    this.data.splice(index, 0, ndata)
  }

  pushColumn(ndata) {
    if (this.data.length == 0) {
      this.data.push(ndata)
    } else {
      console.assert(ndata.length == this.data.length)
      this.data.forEach((elem, idx) => elem.push(ndata[idx]))
    }
  }

  pushRow(ndata) {
    if (this.data.length == 0) {
      this.data.push(ndata)
    } else {
      console.assert(ndata.length == this.data[0].length)
      this.data.push(ndata)
    }
  }

  getNewColumn(fill) {
    let arr = []
    arr.length = this.data.length
    if (arr.length == 0) {
      arr.length = 1
    }
    arr.fill(fill)
    return arr
  }

  getNewRow(fill) {
    let arr = []
    if (this.data.length == 0) {
      arr.length = 1
    } else {
      arr.length = this.data[0].length
    }
    arr.fill(fill)
    return arr
  }

  clone(){
    let newMatrix = new Matrix()
    for(let i = 0; i < this.data.length; i++){
      newMatrix.data[i] = this.data[i].map((x) => x)
    }
  }

}