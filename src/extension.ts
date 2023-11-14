// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import CryptoJS from "crypto-js";
import axios from "axios";
import querystring from "querystring";

function truncate(q: string): string {
  let len = q.length;
  if (len <= 20) {
    return q;
  }
  return q.substring(0, 10) + len + q.substring(len - 10, len);
}

const config = vscode.workspace.getConfiguration("vscodeFanyi");
const appKey = config.get("youdaoAppkey") as string;
const appSecret = config.get("youdaoAppSecret") as string;
// youdao 文本翻译API
async function youdao(query: string) {
  let appKey = "381fca56cbddb0a1";
  let appSecret = ""; //注意：暴露appSecret，有被盗用造成损失的风险
//  const config = vscode.workspace.getConfiguration("vscodeFanyi");
//  const appKey = config.get("youdaoAppkey") as string;
//  const appSecret = config.get("youdaoAppSecret") as string;
  let salt = new Date().getTime();
  let curtime = Math.round(new Date().getTime() / 1000);
  // 多个query可以用\n连接  如 query='apple\norange\nbanana\npear'
  let from = "AUTO";
  let to = "AUTO";
  let str1 = appKey + truncate(query) + salt + curtime + appSecret;

  let sign = CryptoJS.SHA256(str1).toString(CryptoJS.enc.Hex);

  const res = await axios.post(
    "http://openapi.youdao.com/api",
    querystring.stringify({
      q: query,
      appKey,
      salt,
      from,
      to,
      sign,
      signType: "v3",
      curtime,
    })
  );
  console.log(res.data);
  return res.data;
}

// 驼峰转换
function changeWord(text: string): string {
    if (!text.includes(" ") && text.match(/[A-Z]/)) {
        const str = text.replace(/([A-Z])/g, " $1");
        let value = str.substr(0, 1).toUpperCase() + str.substr(1);
        return value;
    }
    return text;
}

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	// console.log('Congratulations, your extension "vscode-fanyi-chengzi" is now active!');

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
	// let disposable = vscode.commands.registerCommand('vscode-fanyi-chengzi.helloWorld', async () => {
		// The code you place here will be executed every time your command is executed
		// Display a message box to the user
	// 	vscode.window.showInformationMessage('Hello World from vscode-fanyi-chengzi!');
	// });

	// context.subscriptions.push(disposable);



	// let disposable = vscode.commands.registerCommand(
	// 	"vscode-fanyi-chengzi.helloWorld",
	// 	async () => {
	// 		const res = await youdao(
	// 		'Congratulations, your extension "vscode-fanyi-chengzi" is now active!'
	// 		);
	// 		vscode.window.showInformationMessage(res.translation[0]);
	// 	}
	// );
	// context.subscriptions.push(disposable);

	context.subscriptions.push(
		vscode.commands.registerCommand("vscode-fanyi-chengzi.replace", async () => {
			let editor = vscode.window.activeTextEditor;
			if (!editor) {
			return; // No open text editor
			}
			let selection = editor.selection;
			let text = editor.document.getText(selection);//选择文本

			//有选中翻译选中的词
			if (text.length) {
			const res = await youdao(text);
			//vscode.window.showInformationMessage(res.translation[0]);
			editor.edit((builder) => {
				builder.replace(selection, res.translation[0]);//替换选中文本
			});
			}
		})
	);

	context.subscriptions.push(
		vscode.languages.registerHoverProvider("*", {
			async provideHover(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken) {
			  const editor = vscode.window.activeTextEditor;
			  if (!editor) {
				return; // No open text editor
			  }
		
			  const selection = editor.selection;
			  const text = document.getText(selection);
		
			  const res = await youdao(changeWord(text));
		
			  const markdownString = new vscode.MarkdownString();
		
			  markdownString.appendMarkdown(
				`#### 翻译 \n\n ${res.translation[0]} \n\n`
			  );
			  if (res.basic) {
				markdownString.appendMarkdown(
				  `**美** ${res.basic["us-phonetic"]}　　　　**英** ${res.basic["uk-phonetic"]}　\n\n`
				);
		
				if (res.basic.explains) {
				  res.basic.explains.forEach((w: string) => {
					markdownString.appendMarkdown(`${w} \n\n`);
				  });
				}
			  }
			  if (res.web) {
				markdownString.appendMarkdown(`#### 网络释义 \n\n`);
				res.web.forEach((w: any) => {
				  markdownString.appendMarkdown(
					`**${w.key}:** ${String(w.value).toString()} \n\n`
				  );
				});
			  }
			  markdownString.supportHtml = true;
			  markdownString.isTrusted = true;
		
			  return new vscode.Hover(markdownString);
			},
		  })
	);
	
}

// This method is called when your extension is deactivated
export function deactivate() {}
