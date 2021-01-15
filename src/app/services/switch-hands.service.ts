import { Injectable } from '@angular/core';

import { AppStateService } from '../services/app-state.service';

@Injectable({
  providedIn: 'root'
})
export class SwitchHandsService {

  constructor(public appStateService: AppStateService) {
    //
  }

  public setDefaultSwapConfiguration() {
    AppStateService.set('SwapAction', 'left');
  }

  public updateSwapConfiguration(swap: string) {
    AppStateService.remove('SwapAction');

    if (swap === 'left') {
      AppStateService.set('SwapAction', 'right');
    } else {
      AppStateService.set('SwapAction', 'left');
    }
  }
}
