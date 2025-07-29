#!/usr/bin/env bash
# dpw@larkspur.localdomain
# 2025-07-29 13:58:26
#

set -eu

g++ -std=c++23 -O2 -o run-backups run-backups.cpp

ls -l run-backups

