const path = require("path");
const fs = require('fs');
const inquirer = require('inquirer');
const { printOutGuideAfterGeneration } = require('./functions');

const CURR_DIR = process.cwd();
const templatePath = path.join(__dirname, '../templates/');
const templateFilePath = path.join(__dirname, '../templates-files/');

// Project generation
/**
 * @param {*} projectName 
 * @param {*} option = {
 *      gitSupport: false
 * } 
 */
function generateTemplate(projectName = '', option = { gitSupport: false }) {
    return new Promise((resolve, reject) => {
        const CHOICES = fs.readdirSync(templatePath);
        const choiceList = [
            {
                name: 'projectChoice',
                type: 'list',
                message: 'What project template would you like to generate?',
                choices: CHOICES
            },
            {
                name: 'projectName',
                type: 'input',
                message: 'Project name:',
                validate: function (input) {
                    if (/^(?!\-)([A-Za-z\-\_\d])+([A-Za-z\d])+$/.test(input))
                        return true;
                    else
                        return false;
                }
            }
        ];
        let QUESTIONS = [];

        projectName.length !== 0 ?
            QUESTIONS = choiceList.slice(0, 1) : // Project name is not null and we don't ask again
            QUESTIONS = choiceList // Project name is null therefor we have two questions

        inquirer.prompt(QUESTIONS)
            .then((answers) => {
                const chosenProjectTemplate = answers.projectChoice;
                const chosenProjectName = projectName.length !== 0 ?
                    projectName :
                    answers.projectName;

                const chosenTemplatePath = templatePath + chosenProjectTemplate;
                const newProjectPath = `${CURR_DIR}/${chosenProjectName}`;

                if (!fs.existsSync(newProjectPath)) {
                    fs.mkdirSync(newProjectPath);

                    createDirectoryContents(chosenTemplatePath, newProjectPath)
                        .then(() => {
                            // Generate .gitignore file and run the "git init" command
                            if (option.gitSupport === true) {
                                gitInstallation(chosenProjectName)
                                    .then(() => generateGitignoreFile(chosenProjectName))
                                    .catch((err) => reject(err));
                            }

                            // Dependency installation
                            dependencyInstallation(chosenProjectName, chosenProjectTemplate)
                                .then(() => resolve(chosenProjectName))
                                .catch((err) => reject(err));
                        })
                        .catch((err) => reject(err));
                } else {
                    reject(Error("d001")); // The directory already exists
                }
            })
            .catch((err) => reject(err));
    });
}

async function createDirectoryContents(templatePath, newProjectPath) {
    const filesToCreate = fs.readdirSync(templatePath);

    filesToCreate.forEach((file) => {
        const origFilePath = `${templatePath}/${file}`;

        // get stats about the current file
        const stats = fs.statSync(origFilePath);

        if (stats.isFile()) {
            const contents = fs.readFileSync(origFilePath);
            const writePath = `${newProjectPath}/${file}`;

            fs.writeFileSync(writePath, contents);

        } else if (stats.isDirectory()) {
            fs.mkdirSync(`${newProjectPath}/${file}`);

            // recursive call
            createDirectoryContents(`${templatePath}/${file}`, `${newProjectPath}/${file}`);
        }
    });
}

// Dependency installation
function gitInstallation(projectName) {
    return new Promise((resolve, reject) => {
        console.log('\nStarting the installation for Git support...');
        const exec = require("child_process").exec;

        exec(`cd ${projectName} && git init`, (error, stdout, stderr) => {
            if (error) {
                console.error(`\x1b[31mERROR\x1b[0m: ${error}`);
                reject(error);
                return;
            }

            console.log(`\n\x1b[32mDone!\x1b[0m Git support installation is completed.`);
            resolve(true);
        });
    });
}

// Installation of all needed dependencies
function dependencyInstallation(projectName, projectTemplate) {
    return new Promise((resolve, reject) => {
        const exec = require("child_process").exec;

        console.log('\nStarting the installation for all needed dependencies...');
        exec(`cd ${projectName} && npm i`, (error, stdout, stderr) => {
            if (error) {
                console.error(`\x1b[31mERROR\x1b[0m: ${error}`);
                reject(error);
                return;
            }

            console.log(`\n\x1b[32mDone!\x1b[0m npm ${stdout}`);

            if (stderr !== '') {
                console.log(`\x1b[35mInformation\x1b[0m: ${stderr}`);
            }

            printOutGuideAfterGeneration(projectName, projectTemplate);
            resolve(true);
        });
    });
}

/**
 * Component generation
 * Using Higher-Order Function (HOF)
 * Input data is (argument, function)
 */
function generateFile(argFullFileName = null, fnGetAndReplaceFileContent, extraOption = {}) {
    return new Promise(function (resolve, reject) {
        if (argFullFileName !== null) {
            const supportedExtension = ["js", "jsx", "gitignore", "css"];
            const seekingExtension = argFullFileName.split('.');

            let fileExtension = '';
            let filteredName = '';

            if (seekingExtension.length > 1) {
                fileExtension = seekingExtension[seekingExtension.length - 1];

                for (i = 0; i < seekingExtension.length - 1; i++) {
                    filteredName += seekingExtension[i];
                }
            }

            if (supportedExtension.indexOf(fileExtension) > -1) {
                // Check if the file will be created in a sub directory
                let newFullFilePath = `${CURR_DIR}/${argFullFileName}`; // Default is in current directory

                if (Object.keys(extraOption).length > 0) {
                    if (extraOption.subDir !== undefined && extraOption.subDir !== '') {
                        newFullFilePath = `${CURR_DIR}/${extraOption.subDir}/${argFullFileName}`;
                    }
                }

                // Check if the file is found
                if (!fs.existsSync(newFullFilePath)) {
                    fs.writeFile(newFullFilePath, fnGetAndReplaceFileContent(filteredName), (err) => {
                        if (!err) {
                            resolve(argFullFileName);
                        } else {
                            reject(err);
                        }
                    });
                } else {
                    reject(Error("f003")); // The file already exists
                }

            } else {
                reject(Error("f001")) // The file extension is not supported
            }

        } else {
            reject(Error("f002")) // The file name can not empty
        }
    });
}

function generateGitignoreFile(subDirectory = '') {
    const extraOption = { subDir: subDirectory };

    return new Promise((resolve, reject) => {
        generateFile('.gitignore', function () {
            const gitignoreTemplatePath = path.join(templateFilePath, '/gitignore.template');
            const gitignoreContent = fs.readFileSync(gitignoreTemplatePath);

            return gitignoreContent;
        }, extraOption)
            .then((result) => resolve(result))
            .catch((error) => reject(error));
    });
}

/**
 * Using for both React component and React-Redux component
 * @param {*} componentName : <component-name.js>
 * @param {*} option : "-c" or "-r" // React component or React-Redux component
 * @param {*} extraOption : { JSON } // using for creating a full component that is a directory with *.js, *.css are within
 */
function generateComponent(componentName = null, option = { componentType: '' }, extraOption = {}) {
    return new Promise((resolve, reject) => {

        // Call an other Promise function -> input data is (argument, function)
        generateFile(componentName, function (filteredName) {
            let templateName;

            // Chosen template file
            option.componentType === "-r" ?
                templateName = '/js-redux-component.template' :
                templateName = '/js-component.template';

            const componentTemplatePath = path.join(templateFilePath, templateName);
            const originalContent = fs.readFileSync(componentTemplatePath, 'utf8');

            const replacedContent = originalContent.replace(/YourClassName/g, filteredName)
                .replace(/\-/g, '');

            // Return the file content
            return replacedContent;

        }, extraOption)
            .then((result) => resolve(result))
            .catch((err) => reject(err));

    });
}

/**
 * A full component that is a directory with *.js, *.css are within.
 * @param {*} componentName : <component-name> is <diectory-name> now.
 * @param {*} option : {
 *      componentType: '' // "-fc" or "-fr" // React component or React-Redux component
 * }
 */
function generateFullComponent(componentName = null, option = { componentType: '' }) {
    return new Promise((resolve, reject) => {
        const newFullDirectoryPath = `${CURR_DIR}/${componentName}`;

        if (!fs.existsSync(newFullDirectoryPath)) {
            fs.mkdirSync(newFullDirectoryPath);

            // Create extra option
            const extraOption = {
                subDir: componentName
            };

            // Create file name
            const newFullJSFileName = `${componentName}.js`;
            const newFullCSSFileName = `${componentName}.css`;

            // Chosen comonent type - React or React-Redux
            let compType;
            option.componentType === "-fr" ?
                compType = "-r" : // React-Redux component
                compType = "-c"; // React component

            // Generate JS file
            const generateJSFile = generateComponent(newFullJSFileName, { componentType: compType }, extraOption);

            // Generate CSS file
            const generateCSSFile = generateFile(newFullCSSFileName, function () {
                return `/* CSS for ${componentName} component */`;
            }, extraOption);

            // Combination all promises
            Promise.all([generateJSFile, generateCSSFile])
                .then(() => resolve(componentName))
                .catch((err) => reject(err));

        } else {
            reject(Error("d001")); // The directory already exists
        }
    });
}

module.exports = {
    generateTemplate,
    generateGitignoreFile,
    generateComponent,
    generateFullComponent
}