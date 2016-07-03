import {Metadata, Type, ArrayType, ReferenceType, Parameter, Property} from '../metadataGeneration/metadataGenerator';
import {templateHelpersContent} from './templateHelpers';
import {expressTemplate} from './templates/express';
import * as fs from 'fs';
import * as handlebars from 'handlebars';
import * as path from 'path';
import * as tsfmt from 'typescript-formatter';

const appRoot: string = require('app-root-path').path;

export class RouteGenerator {
    constructor(private metadata: Metadata, private routeDir: string) { }

    public GenerateRoutes(middlewareTemplate: string) {
        const fileName = `${this.routeDir}/routes.ts`;
        const content = this.buildContent(middlewareTemplate);

        return new Promise<void>((resolve, reject) => {
            tsfmt.processString(fileName, content, {} as any)
                .then(result => fs.writeFile(fileName, result.dest, (err) => resolve()));
        });
    }

    public GenerateExpressRoutes() {
        return this.GenerateRoutes(expressTemplate);
    }

    private buildContent(middlewareTemplate: string) {
        const routesTemplate = handlebars.compile(`
            {{#each controllers}}
            import { {{name}} } from '{{modulePath}}';
            {{/each}}

            const models: any = {
                {{#each models}}
                '{{name}}': {
                    {{#each properties}}
                        '{{name}}': { typeName: '{{typeName}}', required: {{required}} {{#if arrayType}}, arrayType: '{{arrayType}}' {{/if}} },
                    {{/each}}
                },
                {{/each}}
            };
        `.concat(middlewareTemplate));

        return routesTemplate({
            controllers: this.metadata.Controllers.map(controller => {
                return {
                    actions: controller.methods.map(method => {
                        return {
                            method: method.method.toLowerCase(),
                            name: method.name,
                            parameters: method.parameters.map(parameter => this.getTemplateProperty(parameter)),
                            path: this.getExpressPath(method.path)
                        };
                    }),
                    modulePath: this.getRelativeImportPath(controller.location),
                    name: controller.name,
                    path: controller.path
                };
            }),
            models: this.getModels()
        }).concat(templateHelpersContent);
    }

    private getModels(): TemplateModel[] {
        return Object.keys(this.metadata.ReferenceTypes).map(key => {
            const referenceType = this.metadata.ReferenceTypes[key];

            return {
                name: key,
                properties: referenceType.properties.map(property => this.getTemplateProperty(property))
            };
        });
    }

    private getStringRepresentationOfType(type: Type) {
        if (typeof type === 'string' || type instanceof String) {
            return type;
        }

        const arrayType = type as ArrayType;
        if (arrayType.elementType) {
            return 'array';
        }

        return (type as ReferenceType).name;
    }

    private getRelativeImportPath(controllerLocation: string) {
        controllerLocation = controllerLocation.replace('.ts', '');
        return `./${path.relative(path.join(appRoot, this.routeDir), controllerLocation).replace(/\\/g, '/')}`;
    }

    private getTemplateProperty(source: Parameter | Property) {
        const templateProperty: TemplateProperty = {
            required: source.required,
            name: source.name,
            typeName: this.getStringRepresentationOfType(source.type)
        };

        const arrayType = source.type as ArrayType;
        if (arrayType.elementType) {
            templateProperty.arrayType = this.getStringRepresentationOfType(arrayType.elementType);
        }

        return templateProperty;
    }

    private getExpressPath(path: string) {
        return path.replace(/{/g, ':').replace(/}/g, '');
    }
}

interface TemplateModel {
    name: string;
    properties: TemplateProperty[];
}

interface TemplateProperty {
    name: String;
    typeName: string;
    required: boolean;
    arrayType?: string;
}

type TemplateParameter = TemplateProperty;
