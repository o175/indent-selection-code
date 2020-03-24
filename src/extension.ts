// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
enum Direction {
	down,
	up
}
function getLineIndentation(doc: vscode.TextDocument, lineNumber: number){
	const line=doc.lineAt(lineNumber);
	return line.firstNonWhitespaceCharacterIndex;
}
function expandableAtCurrentLevel(doc: vscode.TextDocument, range: vscode.Range){
	const minDepth = getMinimalTextDepth(doc, range);
	return getLineIndentation(doc, doc.lineAt(range.start).lineNumber-1) >= minDepth || 
	getLineIndentation(doc, doc.lineAt(range.end).lineNumber+1) >= minDepth; 
}
function rangeToSelection(range: vscode.Range, direction: Direction) {
	return direction === Direction.down ?
	new vscode.Selection(range.start, range.end):
	new vscode.Selection(range.end, range.start);
}
function selectionDirecion(selection: vscode.Selection) {
	return selection.isReversed? Direction.up: Direction.down;
}

function getMinimalTextDepth(doc: vscode.TextDocument, range: vscode.Range){
	const startLine = doc.lineAt(range.start);
	const endLine = doc.lineAt(range.end);
	let lineNumber = startLine.lineNumber;
	let min = +Infinity;
	while(lineNumber <= endLine.lineNumber){
		const currentIndentation = getLineIndentation(doc, lineNumber);
		if(currentIndentation < min){
			min = currentIndentation;
		}
		lineNumber++;
	}
	return min;
}
function getExpansionOfSameLevel(doc: vscode.TextDocument, postiton: vscode.Position, direction: Direction) {
	const line = doc.lineAt(postiton.line);
	const currentLevel = getLineIndentation(doc, line.lineNumber);
	let lineNumber = line.lineNumber;
	while(
		getLineIndentation(doc, lineNumber + (direction === Direction.down? 1 : -1)) >= currentLevel  
	){
		lineNumber += (direction === Direction.down? 1 : -1);
	}
	return line.range.union(doc.lineAt(lineNumber).range);
}
function getNewSelection(doc: vscode.TextDocument, current: vscode.Selection): vscode.Selection{
	const line = doc.lineAt(current.active);

	const direction = selectionDirecion(current);
	if(current.isSingleLine){
		return rangeToSelection(line.range, direction);
	}
	const minDepth = getMinimalTextDepth(doc, current);
	if (expandableAtCurrentLevel(doc, current)){
		return rangeToSelection( current
			.union(getExpansionOfSameLevel(doc, current.start, Direction.up)
			.union(getExpansionOfSameLevel(doc, current.end, Direction.down)
			)), direction);

	} else {
		const prevLineDepth =  getLineIndentation(doc, current.start.line -1);
		const nextLineDepth =  getLineIndentation(doc, current.end.line +1) ;
		let newRange: vscode.Range;
		if(prevLineDepth === nextLineDepth ) {
			newRange = doc.lineAt(current.start.line - 1).range.union(doc.lineAt(current.end.line + 1).range)
		} else if(
			prevLineDepth > nextLineDepth
		){
			newRange = doc.lineAt(current.start.line - 1).range.union(current);
		} else {
			newRange = doc.lineAt(current.end.line + 1).range.union(current);
		}
		return rangeToSelection(newRange, direction);

	}
	return new vscode.Selection(line.range.start, line.range.end);
}
export function activate(context: vscode.ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "select-indentation" is now active!');

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
	let disposable = vscode.commands.registerTextEditorCommand('select-indentation.expand-selection', (editor) => {
		const doc = editor.document;
		if (!doc) { return; };

		editor.selections = editor.selections.map(selection=>getNewSelection(doc, selection));
	});

	context.subscriptions.push(disposable);
}

// this method is called when your extension is deactivated
export function deactivate() {}
