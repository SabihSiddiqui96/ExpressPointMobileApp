import { NgModule, ErrorHandler } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { RouteReuseStrategy } from '@angular/router';
import { IonicModule, IonicRouteStrategy } from '@ionic/angular';
import { SplashScreen } from '@ionic-native/splash-screen/ngx';
import { StatusBar } from '@ionic-native/status-bar/ngx';
import { Network } from '@ionic-native/network/ngx';
import { Device } from '@ionic-native/device/ngx';
import { Keyboard } from '@ionic-native/keyboard/ngx';
import { BackgroundMode } from '@ionic-native/background-mode/ngx';
import { HTTP } from '@ionic-native/http/ngx';
import { Idle } from '@ng-idle/core';
import { AppRoutingModule } from './app-routing.module';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { HttpClientModule, HTTP_INTERCEPTORS } from '@angular/common/http';
import { AppComponent } from './app.component';
import { ElectronService } from './services/electron.service';
import { PouchQueriesService } from '../app/services/Database/pouch-queries.service';
import { PouchDBService } from '../app/services/pouch-db.service';
import { HttpInterceptorService } from '../app/services/HTTP/http-interceptor.service';
import { PrintService } from '../app/services/print.service';
import { AuthService } from '../app/services/auth.service';
import { NgIdleModule } from '@ng-idle/core'
import { AppVersion } from '@ionic-native/app-version/ngx';
import { Events } from './services/events.service';
import { IonDigitKeyboard } from '../components/ion-digit-keyboard/ion-digit-keyboard.module';
import { IonDigitKeyboardCmp } from '../components/ion-digit-keyboard/components/ion-digit-keyboard-cmp/ion-digit-keyboard-cmp';
import { MenuAllergensPopupPage } from '../app/pages/menu-allergens-popup/menu-allergens-popup.page';
import { MenuOrderPayPage } from '../app/pages/menu-order-pay/menu-order-pay.page';
import { MenuCategoryModelPage } from '../app/pages/menu-category-model/menu-category-model.page';
import { MenuPaymentPopupPage } from '../app/pages/menu-payment-popup/menu-payment-popup.page';
import { CloseSessionCardPage } from '../app/pages/close-session-card/close-session-card.page';
import { CloseSessionCheckPage } from '../app/pages/close-session-check/close-session-check.page';
import { TransactionMealTypePopupPage } from '../app/pages/transaction-meal-type-popup/transaction-meal-type-popup.page'
import { MenuServicePage } from './pages/menu-service/menu-service.page';
import { PatronLookupPage } from './pages/patron-lookup/patron-lookup.page';
import { ServiceSelectionPage } from './pages/service-selection/service-selection.page';
import { LoginPage } from './pages/login/login.page';
import { AboutPage } from './pages/about/about.page';
import { ClassroomSalePage } from './pages/classroom-sale/classroom-sale.page';
import { CommentsPopupPage } from './pages/comments-popup/comments-popup.page';
import { ContactPage } from './pages/contact/contact.page';
import { DeviceConnectionPage } from './pages/device-connection/device-connection.page';
import { DeviceConnectionSearchPage } from './pages/device-connection-search/device-connection-search.page';
import { DeviceIdentificationPopupPage } from './pages/device-identification-popup/device-identification-popup.page';
import { DynamicMenuPage } from './pages/dynamic-menu/dynamic-menu.page';
import { HomePage } from './pages/home/home.page';
import { LogoutPage } from './pages/logout/logout.page';
import { MenuAllergenInstructionPopupPage } from './pages/menu-allergen-instruction-popup/menu-allergen-instruction-popup.page';
import { MenuInstructionsPopupPage } from './pages/menu-instructions-popup/menu-instructions-popup.page';
import { OpenSessionPage } from './pages/open-session/open-session.page';
import { PaymentsPage } from './pages/payments/payments.page';
import { PreOrdersPage } from './pages/pre-orders/pre-orders.page';
import { ResetPasswordPage } from './pages/reset-password/reset-password.page';
import { SchoolSelectionPage } from './pages/school-selection/school-selection.page';
import { SummarySalePage } from './pages/summary-sale/summary-sale.page';
import { TabsPage } from './pages/tabs/tabs.page';
import { SchoolcafeUrlSearchPage } from '../app/pages/schoolcafe-url-search/schoolcafe-url-search.page';
import { StatusPopupPage } from '../app/pages/status-popup/status-popup.page';
import { AllPopupPage } from '../app/pages/all-popup/all-popup.page';
import { UserDetailsPopupPage } from '../app/pages/user-details-popup/user-details-popup.page';
import { MenuServiceOptionsPage } from '../app/pages/menu-service-options/menu-service-options.page';
import { MenuItemQuantityPopupPage } from '../app/pages/menu-item-quantity-popup/menu-item-quantity-popup.page';
import { MenuSoldPopupPage } from '../app/pages/menu-sold-popup/menu-sold-popup.page';
import { SaleDetailsPopupPage } from '../app/pages/sale-details-popup/sale-details-popup.page';
import { TransactionDetailsPopupPage } from '../app/pages/transaction-details-popup/transaction-details-popup.page';
import { PatronListModalPage } from '../app/pages/patron-list-modal/patron-list-modal.page';
import { CloseSessionPage } from './pages/close-session/close-session.page';
import { QuickClassroomSalePage } from './pages/quick-classroom-sale/quick-classroom-sale.page';
import { KeyDownListenerModule } from './directives/key-down-listener/key-down-listener.module';
import { OpenNativeSettings } from '@ionic-native/open-native-settings/ngx';
import { SessionTimeoutService } from './services/session-timeout.service';
import { GeneralDBService } from './services/Database/general-db.service';
import { DynamicMenusDBService } from './services/Database/dynamic-menus-db.service';
import { StaticMenusDBService } from './services/Database/static-menus-db.service';
import { PersonDBService } from './services/Database/person-db.service';
import { SystemDBService } from './services/Database/system-db.service';
import { UsersDBService } from './services/Database/users-db.service';
import { LookupService } from './services/lookup.service';
import { SwitchHandsService } from './services/switch-hands.service';
import { HttpService } from './services/HTTP/http.service';
import { PopupMessageService } from './services/popup-message.service';
import { NetworkService } from './services/network.service';
import { UtilService } from './services/util.service';
import { UrlsService } from './services/urls.service';
import { AppStateService } from './services/app-state.service';
import { StorageService } from './services/storage.service';
import { PersonService } from './services/person.service';
import { TransactionService } from './services/transaction.service';
import { RestrictionsService } from './services/restrictions.service';
import { SettingService } from './services/setting.service';
import { DeviceService } from './services/device.service';
import { MenugridService } from './services/menugrid.service';
import { SystemService } from './services/system.service';
import { SignalRService } from './services/SignalR.service';
import { HashingService } from './services/hashing.service'
import { LocalTimerService } from './services/local-timer.service';
import { DeviceControlsService } from './services/device-controls.service';
import { HasPropPipe } from './pipes/hasProperty.pipe';

@NgModule({
    declarations: [
        AppComponent,
        MenuAllergensPopupPage,
        MenuOrderPayPage,
        MenuCategoryModelPage,
        MenuPaymentPopupPage,
        CloseSessionCardPage,
        CloseSessionCheckPage,
        TransactionMealTypePopupPage,
        MenuServicePage,
        PatronLookupPage,
        ServiceSelectionPage,
        LoginPage,
        AboutPage,
        ClassroomSalePage,
        CommentsPopupPage,
        ContactPage,
        DeviceConnectionPage,
        DeviceConnectionSearchPage,
        DeviceIdentificationPopupPage,
        DynamicMenuPage,
        HomePage,
        LogoutPage,
        MenuAllergenInstructionPopupPage,
        MenuInstructionsPopupPage,
        OpenSessionPage,
        PaymentsPage,
        PreOrdersPage,
        ResetPasswordPage,
        SchoolSelectionPage,
        SummarySalePage,
        TabsPage,
        SchoolcafeUrlSearchPage,
        StatusPopupPage,
        AllPopupPage,
        UserDetailsPopupPage,
        MenuServiceOptionsPage,
        MenuItemQuantityPopupPage,
        MenuSoldPopupPage,
        SaleDetailsPopupPage,
        TransactionDetailsPopupPage,
        PatronListModalPage,
        CloseSessionPage,
        QuickClassroomSalePage,
        HasPropPipe
    ],
    entryComponents: [

        /** ModalController, PopoverController */
        SchoolcafeUrlSearchPage,
        AllPopupPage,
        UserDetailsPopupPage,
        MenuServiceOptionsPage,
        MenuItemQuantityPopupPage,
        MenuSoldPopupPage,
        SaleDetailsPopupPage,
        TransactionDetailsPopupPage,
        StatusPopupPage,
        PatronListModalPage,
        MenuAllergensPopupPage,
        MenuOrderPayPage,
        MenuCategoryModelPage,
        MenuPaymentPopupPage,
        CloseSessionCardPage,
        CloseSessionCheckPage,
        TransactionMealTypePopupPage,
        /** ModalController, PopoverController */

        /** Components */
        IonDigitKeyboardCmp,
        MenuServicePage,
        PatronLookupPage,
        ServiceSelectionPage,
        LoginPage,
        AboutPage,
        ClassroomSalePage,
        CommentsPopupPage,
        ContactPage,
        DeviceConnectionPage,
        DeviceConnectionSearchPage,
        DeviceIdentificationPopupPage,
        DynamicMenuPage,
        HomePage,
        LogoutPage,
        MenuAllergenInstructionPopupPage,
        MenuInstructionsPopupPage,
        OpenSessionPage,
        PaymentsPage,
        PreOrdersPage,
        ResetPasswordPage,
        SchoolSelectionPage,
        SummarySalePage,
        TabsPage,
        CloseSessionPage,
        QuickClassroomSalePage
        /** Components */
    ],
    imports: [
        BrowserModule,
        AppRoutingModule,
        HttpClientModule,
        IonDigitKeyboard,
        CommonModule,
        FormsModule,
        ReactiveFormsModule,
        KeyDownListenerModule,
        NgIdleModule.forRoot(),
        IonicModule.forRoot({ mode: 'md' })
    ],
    providers: [
        StatusBar,
        SplashScreen,
        BackgroundMode,
        HTTP,
        Device,
        Network,
        Keyboard,
        Idle,
        AppVersion,
        PouchQueriesService,
        PouchDBService,
        PrintService,
        Events,
        AuthService,
        UrlsService,
        OpenNativeSettings,
        SessionTimeoutService,
        GeneralDBService,
        DynamicMenusDBService,
        StaticMenusDBService,
        PersonDBService,
        SystemDBService,
        UsersDBService,
        LookupService,
        SwitchHandsService,
        HttpService,
        PopupMessageService,
        NetworkService,
        UtilService,
        HttpInterceptorService,
        UtilService,
        AppStateService,
        StorageService,
        PersonService,
        TransactionService,
        RestrictionsService,
        SettingService,
        DeviceService,
        ElectronService,
        MenugridService,
        SystemService,
        SignalRService,
        HashingService,
        LocalTimerService,
        SystemDBService,
        DeviceControlsService,
        { provide: HTTP_INTERCEPTORS, useClass: HttpInterceptorService, multi: true },
        [{ provide: ErrorHandler, useClass: ErrorHandler },
        { provide: RouteReuseStrategy, useClass: IonicRouteStrategy }]
    ],
    bootstrap: [AppComponent]
})
export class AppModule { }
