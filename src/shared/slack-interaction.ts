import {deleteEntry, getContributions} from "./dynamo";
import axios from "axios";
import {Config} from "./config";

export type LambdaResponse = {
    statusCode: number,
    body: string
}

export function postMessage(channel: string, message: string, attachments: any = []): Promise<any> {
    return axios.post('https://slack.com/api/chat.postMessage', {
        text: message,
        channel: channel,
        attachments: attachments
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
                    color: (function(status) {
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
                            title: "Rollback ID",
                            value: `${item.id}-${item.sequence}`,
                            short: true
                        }
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
    const helpMessage = [
        "*Hi there!*",
        "My name is Ossi :robot_face:, and I'm here to record your Open Source Contributions.",
        "",
        "You can send me a *private message* which describes your contribution. Then I will ask you, if you want to submit given contribution. " +
        "If you decide to submit, I will store the contribution to DynamoDB and notify my management channel about new contribution.",
        "When your contribution gets processed, I will notify you back.",
        "",
        "I have additional features under this slash command",
        "",
        "`list` lists your submitted contibutions",
        "`rollback ROLLBACK_ID` removes your contribution with given rollback id (don't use this unless you exactly know, what you are doing)",
        "",
        "_Information about the policy_: https://intra.solita.fi/pages/viewpage.action?pageId=76514684",
        "_My source code_: https://github.com/solita/ossi-bot _(not yet published)_"
    ].join('\n');
    return Promise.resolve({
        statusCode: 200,
        body: helpMessage
    })
}