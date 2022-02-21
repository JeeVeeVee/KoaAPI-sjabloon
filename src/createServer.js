const Koa = require('koa');
const bodyParser = require('koa-bodyparser');
const koaCors = require('@koa/cors');
const config = require('config');
const ServiceError = require('./core/serviceError');
const installRest = require('./rest')
const {initializeData} = require("./data");

//const NODE_ENV = config.get('env');
const PORT =  9000 //|| process.env.PORT;
//console.log(NODE_ENV)
const CORS_ORIGINS = ['http://localhost:3000'];
const CORS_MAX_AGE = 3 * 60 * 60;



module.exports = async function createServer() {
    //wont work without any options
    //await initializeData();



    const app = new Koa();
    app.use(
        koaCors({
            origin: (ctx) => {
                if (CORS_ORIGINS.indexOf(ctx.request.header.origin.toString()) !== -1) {
                    return ctx.request.header.origin;
                }
                // Not a valid domain at this point, let's return the first valid as we should return a string
                return CORS_ORIGINS[1];
            },
            allowHeaders: ['Accept', 'Content-Type', 'Authorization'],
            maxAge: CORS_MAX_AGE,
        })
    );
    app.use(bodyParser());
    app.use(async (ctx, next) => {
        try {
            await next();

            if (ctx.status === 404) {
                ctx.body = {
                    code: 'NOT_FOUND',
                    message: `Unknown resource: ${ctx.url}`,
                };
            }
        } catch (error) {
            console.error('Error occured while handling a request', {
                error: (error),
            });

            let statusCode = error.status || 500;
            let errorBody = {
                code: error.code || 'INTERNAL_SERVER_ERROR',
                message: error.message,
                details: error.details || {},
                stack: NODE_ENV !== 'production' ? error.stack : undefined,
            };

            if (error instanceof ServiceError) {
                if (error.isNotFound) {
                    statusCode = 404;
                }

                if (error.isValidationFailed) {
                    statusCode = 400;
                }

                if (error.isUnauthorized) {
                    statusCode = 401;
                }

                if (error.isForbidden) {
                    statusCode = 403;
                }
            }
            ctx.status = statusCode;
            ctx.body = errorBody;
        }
    });



    await installRest(app);



    return {
        getApp() {
            return app;
        },

        start() {
            return new Promise((resolve) => {
                app.listen(PORT);
                console.info(`🚀 Server listening on http://localhost:9000`);
                resolve()
            })
        },

        async stop() {
            {
                app.removeAllListeners();
                await shutdownData();
                getLogger().info('Goodbye');
            }
        }
    }
}