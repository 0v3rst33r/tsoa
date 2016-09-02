import { Route } from '../../../src/decorators/route';
import { Get } from '../../../src/decorators/methods';
import { TestModel } from '../testModel';
import { ModelService } from '../services/modelService';

@Route('GetTest')
export class InvalidGetTestController {
  @Get('Complex')
  public async getModelWithComplex(myModel: TestModel): Promise<TestModel> {
    return new ModelService().getModel();
  }
}
