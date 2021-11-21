HASH := $()

build:
	docker build . -t joe4576/blight-api

run:
	docker run -p 49160:8080 -d joe4576/blight-api

deploy:
	docker build . -t joe4576/blight-api --platform linux/amd64
	docker tag joe4576/blight-api eu.gcr.io/blight-weather-data/blight-api
	docker push eu.gcr.io/blight-weather-data/blight-api
	gcloud run deploy blight-api --image eu.gcr.io/blight-weather-data/blight-api

list_containers:
	gcloud container images list-tags eu.gcr.io/blight-weather-data/blight-api

remove_container:
	gcloud container images delete eu.gcr.io/blight-weather-data/blight-api@sha256:$(HASH)