import { NextFunction, Request, Response } from 'express';
import { AppLogger } from '../logger';
import { utcToZonedTime, format } from 'date-fns-tz';
import axios from 'axios';

export const getErrorResponseConfig = (): boolean => {
    return process.env.NODE_ENV === 'development' ? !!parseInt(process.env.SEND_ERROR_STACK as string) : false;
};

const handleError = (err: Error) => {
    const timeZone = 'Asia/Seoul';
    const zonedDate = utcToZonedTime(new Date(), 'Asia/Seoul');
    const pattern = 'yyyy-MM-dd HH:mm:ss.SS';

    const now = format(zonedDate, pattern, { timeZone });
    const text = `<!channel> Dxc-api-server Error occured at \`${now} (Korea Time)\`\n` + '```' + err.stack + '```';
    axios({
        method: 'POST',
        url: 'https://hooks.slack.com/services/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',
        headers: {
            'Content-Type': 'application/json',
        },
        data: { text: text },
    }).catch((error) => {
        console.error(error);
    });
};

export const errorHandler = (logger: AppLogger) => {
    const shouldSendError = getErrorResponseConfig();

    return (err: Error, req: Request, res: Response, next: NextFunction) => {
        // 이미 res를 보내지 않았을때만 res를 보냄
        if (!res.headersSent) {
            //@ts-ignore
            if (!shouldSendError && !err.status) {
                res.sendStatus(500); // same as res.status(500).send('Internal Server Error')
            } else {
                //@ts-ignore
                res.status(err.status || 500).send(shouldSendError ? err.stack : err.message);
            }
        }
        if (res.statusCode > 499) {
            //@ts-ignore
            logger.error(err);
            if (process.env.NODE_ENV === 'production') {
                handleError(err);
            }
        }
    };
};