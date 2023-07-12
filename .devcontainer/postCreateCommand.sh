#!/bin/bash

npm install

# also install dependencies for `pr-collector`
cd pr-collector
npm install
npm run build && npm run package

cd ..