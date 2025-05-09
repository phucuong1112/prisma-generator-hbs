#!/bin/bash

WORK_DIR=$(pwd)
rm -rf $WORK_DIR/packages/usage/gen/crud-api

cd $WORK_DIR/packages/generator && pnpm run build
cd $WORK_DIR/packages/usage && pnpm prisma generate

ls -la $WORK_DIR/packages/usage/generated
tree $WORK_DIR/packages/usage/generated

# echo "=== prettier ==="
# npx -y prettier $WORK_DIR/packages/usage/generated/crud-api --write
