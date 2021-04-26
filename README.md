# Satisfactory Calculator

## Description

This calculator is meant to help all **Satisfactorians** helping plan their awesome factories. A [Sankey diagram](https://en.wikipedia.org/wiki/Sankey_diagram) helps to visualize the amount of material flow. Unwanted products can be hidden intuitively to focus on relevant ones.

## Setup 

This implementation is based on JavaScript and requires a web server to be run on and a browser of your choice to be displayed.
For further information see e.g. [apache tutorial](https://ubuntu.com/tutorials/install-and-configure-apache#1-overview) to setup your own web server.

## Live Versions

Live version can be found here:
[Stable Version](http://barthler.ddns.net/satisfactory-calculator/calc.html)
[Experimental Version](http://barthler.ddns.net/satisfactory-calculator-experimental/calc.html)

## Content

Receipts for update 4 with FICSMAS holiday special are included.

## Known issues

* Solutions are with respect to byproducts, but byproducts are not yet displayed in Sankey Diagram due to prohibited circularities, which can be introduced through byproducts.
* Only one receipt per product can be selected, no mixture is possible

Feel free to create issues if you have any problems.

## Acknowledgment

This implementation is based on the [factorio-calculator](https://github.com/KirkMcDonald/kirkmcdonald.github.io) by KirkMcDonald.<br>
Receipts and icons are from [Satisfactory-Wiki](https://satisfactory.fandom.com/wiki/Satisfactory_Wiki).