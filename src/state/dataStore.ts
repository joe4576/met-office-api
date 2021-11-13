import { AllFilteredData } from "../types/types";

class DataStore {
  // note: get observed and forecast every 3 hours
  // todo: change any to AllFilteredData
  private observedStore: any[] = [];
  private observedStoreSize: number = 8;

  private forecastStore: any[] = [];

  public getObservedStore(): any[] {
    return this.observedStore;
  }

  public getForecastStore(): any[] {
    return this.forecastStore;
  }

  public addToObservedStore(data: any): void {
    if (this.observedStore.length === this.observedStoreSize) {
      this.observedStore.pop();
    }
    this.observedStore.unshift(data);
  }

  public addToForecastStore(data: any): void {
    this.forecastStore.pop();
    this.forecastStore.push(data);
  }
}

export default new DataStore();
