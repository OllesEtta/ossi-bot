import {deleteEntry, getContributions} from "./dynamo";
import axios from "axios";
import * as moment from 'moment-timezone';
import {Config} from "./config";

export interface LambdaResponse {
    statusCode: number,
    body: string
}

export function postMessage(channel: string, message: string, attachments: any = []): Promise<any> {
    return axios.post('https://slack.com/api/chat.postMessage', {
        attachments,
        channel,
        text: message
    }, {
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${Config.get('SLACK_TOKEN')}`
        }
    }).then(() => ({statusCode: 200}));
}

/**
 * Deletes given contribution from the dynamodb
 *
 * @param rollbackId
 */
export function rollbackContribution(rollbackId: string): Promise<LambdaResponse> {
    if(!rollbackId) {
        return Promise.resolve({
            statusCode: 200,
            body: JSON.stringify({
                "response_type": "ephemeral",
                "text": "Pass rollback id to delete entry"
            })
        });
    }
    const [id, seq] = rollbackId.split('-');
    return deleteEntry(id, seq)
        .then(() => {
            return Promise.resolve({
                statusCode: 200,
                body: JSON.stringify({
                    "response_type": "ephemeral",
                    "text": `OK, I deleted your contribution with ID: ${rollbackId}`
                })
            });
        })
}

/**
 * Lists users contributions.
 *
 * @param userId
 */
export function listContributions(userId: string): Promise<LambdaResponse> {
    return getContributions(userId).then((results) => {
        const response = {
            text: results.length === 0 ?
                'You do not have any contributions. Submit one by sending a private message to Ossitron-2000!' :
                'Here is the listing of your open source contribution submissions',
            attachments: results.map((item) => {
                return {
                    fallback: 'fallback',
                    color: ((status) => {
                        if(status === 'PENDING') {
                            return "#ffff00";
                        }
                        if(status === 'ACCEPTED') {
                            return "#36a64f";
                        }
                        if(status === 'DECLINED') {
                            return "#ff0000";
                        }
                    })(item.status),
                    text: item.text,
                    fields: [
                        {
                            title: "Size",
                            value: item.size,
                            short: true
                        },
                        {
                            title: "Status",
                            value: item.status,
                            short: true
                        },
                        {
                            title: "Submitted",
                            value: moment(item.timestamp).tz('Europe/Helsinki').format('D.M.YYYY HH:mm:ss'),
                            short: true
                        },
                    ]
                };
            })
        };
        return {
            statusCode: 200,
            body: JSON.stringify(response)
        };
    });
}

/**
 * Replies with help text
 */
export function replyWithHelp(): Promise<LambdaResponse> {
    // KLUDGE: environment should be mocked for tests, because Config is fail fast
    let version;
    let environment;

    try {
      version = Config.get('VERSION');
      environment = Config.get('ENVIRONMENT');
    } catch (e) {
        console.error("Something went wrong with fetching config", e);
    }
    const helpMessage = [
        "*Hi there!*",
        "",
        "My name is Ossi (a.k.a Ossitron-2000) :robot_face:, and I'm here to record your Open Source Contributions. :gem:",
        "",
        "You can send me (Ossitron-2000) a *private message* which describes your contribution. Then I will ask, if you want to submit given contribution. " +
        "If you decide to submit, I will store the contribution to DynamoDB and notify my management channel about your contribution.",
        "",
        "When your contribution gets processed, I will notify you back.", ,
        "",
        "If you have questions about the process contact Valtteri Valovirta. If I'm broken contact Juho Friman.",
        "",
        "I have additional features under this slash command. My slash commands are all _ephemeral_ which means only you see the results. So feel free to shoot slash commands at any channel.",
        "",
        "`help` shows this help",
        "`list` lists your submitted contributions",
        "",
        "I'm deployed into :aws-super-hero: AWS Cloud to `eu-north-1` region to Solita Sandbox account. I'm built of Node.js, Typescript, Serverless, Api Gateway, Lambda and DynamoDB.",
        "",
        "_Information about the policy_: https://intra.solita.fi/pages/viewpage.action?pageId=76514684",
        "_My source code_: https://github.com/solita/ossi-bot",
        `_Deployment_: ${version} ${environment}`
    ].join('\n');
    return Promise.resolve({
        statusCode: 200,
        body: helpMessage
    })
}
