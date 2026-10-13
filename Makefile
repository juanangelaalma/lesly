.DEFAULT_GOAL := help

PORT ?= 3000
HOST ?= 0.0.0.0

.PHONY: help dev db-start db-stop build start

help:
	@printf '%s\n' \
		'make dev       Jalankan Supabase lokal dan server development' \
		'make db-start  Jalankan Supabase lokal saja' \
		'make db-stop   Hentikan Supabase proyek ini tanpa menghapus data' \
		'make build     Build aplikasi untuk produksi' \
		'make start     Jalankan hasil build produksi' \
		'' \
		'Opsi: make dev PORT=3001 HOST=127.0.0.1'

dev: db-start
	npm run dev -- --hostname $(HOST) --port $(PORT)

db-start:
	npx supabase start

db-stop:
	npx supabase stop

build:
	npm run build

start:
	npm run start -- --hostname $(HOST) --port $(PORT)
