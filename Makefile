build:
	docker build . -t joe4576/blight-api

run:
	docker run -p 49160:8080 -d joe4576/blight-api