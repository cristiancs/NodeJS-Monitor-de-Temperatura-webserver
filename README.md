# NodeJS Temperature Monitoring System
Monitor the temperature of DHT22 sensors

+MongoDB storage
+Socket updates
+HTTP Panel


For running the server i recommend use [forever](https://github.com/foreverjs/forever)

[How to install mongoDB on Centos](http://cristiannavarrete.com/blog/instalar-mongodb-centos-7/)

The "cliente" folder goes on the Raspberry pi

The "servidor" folder goes on te server used for http server (You can use your raspberry for bot)

*Remember to change config info on client.js and server.js

You need to install [bcm2835](http://www.airspayce.com/mikem/bcm2835/) on your raspberry for get it working