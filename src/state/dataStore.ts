import { AllFilteredData } from "../types/types";

class DataStore {
  private forecastStore: AllFilteredData[] = [];

  public getForecastStore(): AllFilteredData[] {
    return this.forecastStore;
  }

  public addToForecastStore(data: AllFilteredData): void {
    this.forecastStore.pop();
    this.forecastStore.push(data);
  }
}

export default new DataStore();
