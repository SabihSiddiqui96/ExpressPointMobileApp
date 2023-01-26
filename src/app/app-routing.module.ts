import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { MenuServicePage } from './pages/menu-service/menu-service.page';
import { TransactionDetailsPopupPage } from './pages/transaction-details-popup/transaction-details-popup.page';
import { SaleDetailsPopupPage } from './pages/sale-details-popup/sale-details-popup.page';
import { ServiceSelectionPage } from './pages/service-selection/service-selection.page';
import { LoginPage } from './pages/login/login.page';
import { AboutPage } from './pages/about/about.page';
import { AllPopupPage } from './pages/all-popup/all-popup.page';
import { ClassroomSalePage } from './pages/classroom-sale/classroom-sale.page';
import { CloseSessionCheckPage } from './pages/close-session-check/close-session-check.page';
import { CloseSessionCardPage } from './pages/close-session-card/close-session-card.page';
import { CommentsPopupPage } from './pages/comments-popup/comments-popup.page';
import { ContactPage } from './pages/contact/contact.page';
import { DeviceConnectionPage } from './pages/device-connection/device-connection.page';
import { DeviceConnectionSearchPage } from './pages/device-connection-search/device-connection-search.page';
import { DeviceIdentificationPopupPage } from './pages/device-identification-popup/device-identification-popup.page';
import { DynamicMenuPage } from './pages/dynamic-menu/dynamic-menu.page';
import { HomePage } from './pages/home/home.page';
import { LogoutPage } from './pages/logout/logout.page';
import { MenuAllergenInstructionPopupPage } from './pages/menu-allergen-instruction-popup/menu-allergen-instruction-popup.page';
import { MenuAllergensPopupPage } from './pages/menu-allergens-popup/menu-allergens-popup.page';
import { MenuCategoryModelPage } from './pages/menu-category-model/menu-category-model.page';
import { MenuInstructionsPopupPage } from './pages/menu-instructions-popup/menu-instructions-popup.page';
import { MenuItemQuantityPopupPage } from './pages/menu-item-quantity-popup/menu-item-quantity-popup.page';
import { MenuOrderPayPage } from './pages/menu-order-pay/menu-order-pay.page';
import { MenuPaymentPopupPage } from './pages/menu-payment-popup/menu-payment-popup.page';
import { MenuServiceOptionsPage } from './pages/menu-service-options/menu-service-options.page';
import { MenuSoldPopupPage } from './pages/menu-sold-popup/menu-sold-popup.page';
import { OpenSessionPage } from './pages/open-session/open-session.page';
import { PatronListModalPage } from './pages/patron-list-modal/patron-list-modal.page';
import { PaymentsPage } from './pages/payments/payments.page';
import { PreOrdersPage } from './pages/pre-orders/pre-orders.page';
import { ResetPasswordPage } from './pages/reset-password/reset-password.page';
import { SchoolSelectionPage } from './pages/school-selection/school-selection.page';
import { SchoolcafeUrlSearchPage } from './pages/schoolcafe-url-search/schoolcafe-url-search.page';
import { StatusPopupPage } from './pages/status-popup/status-popup.page';
import { SummarySalePage } from './pages/summary-sale/summary-sale.page';
import { TabsPage } from './pages/tabs/tabs.page';
import { UserDetailsPopupPage } from './pages/user-details-popup/user-details-popup.page';
import { TransactionMealTypePopupPage } from './pages/transaction-meal-type-popup/transaction-meal-type-popup.page';
import { CloseSessionPage } from './pages/close-session/close-session.page';

const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  {
    path: 'login',
    component: LoginPage,
    data: {
      preload: true
    }
  },
  {
    path: 'about',
    component: AboutPage,
    data: {
      preload: true
    }
  },
  {
    path: 'all-popup',
    component: AllPopupPage,
    data: {
      preload: true
    }
  },
  {
    path: 'classroom-sale',
    component: ClassroomSalePage,
    data: {
      preload: true
    }
  },
  {
    path: 'close-session',
    component: CloseSessionPage,
    data: {
      preload: true
    }
  },
  {
    path: 'close-session-card',
    component: CloseSessionCardPage,
    data: {
      preload: true
    }
  },
  {
    path: 'close-session-check',
    component: CloseSessionCheckPage,
    data: {
      preload: true
    }
  },
  {
    path: 'comments-popup',
    component: CommentsPopupPage,
    data: {
      preload: true
    }
  },
  {
    path: 'contact',
    component: ContactPage,
    data: {
      preload: true
    }
  },
  {
    path: 'device-configuration',
    loadChildren: './pages/device-configuration/device-configuration.module#DeviceConfigurationPageModule',
    data: {
      preload: true
    }
  },
  {
    path: 'device-connection',
    component: DeviceConnectionPage,
    data: {
      preload: true
    }
  },
  {
    path: 'device-connection-search',
    component: DeviceConnectionSearchPage,
    data: {
      preload: true
    }
  },
  {
    path: 'device-controls',
    loadChildren: './pages/device-controls/device-controls.module#DeviceControlsPageModule',
    data: {
      preload: true
    }
  },
  {
    path: 'device-identification-popup',
    component: DeviceIdentificationPopupPage,
    data: {
      preload: true
    }
  },
  {
    path: 'device-info',
    loadChildren: './pages/device-info/device-info.module#DeviceInfoPageModule',
    data: {
      preload: true
    }
  },
  {
    path: 'dynamic-menu',
    component: DynamicMenuPage,
    data: {
      preload: true
    }
  },
  {
    path: 'home',
    component: HomePage,
    data: {
      preload: true
    }
  },
  {
    path: 'logout',
    component: LogoutPage,
    data: {
      preload: true
    }
  },
  {
    path: 'menu-allergen-instruction-popup',
    component: MenuAllergenInstructionPopupPage,
    data: {
      preload: true
    }
  },
  {
    path: 'menu-allergens-popup',
    component: MenuAllergensPopupPage,
    data: {
      preload: true
    }
  },
  {
    path: 'menu-category-model',
    component: MenuCategoryModelPage,
    data: {
      preload: true
    }
  },
  {
    path: 'menu-instructions-popup',
    component: MenuInstructionsPopupPage,
    data: {
      preload: true
    }
  },
  {
    path: 'menu-item-quantity-popup',
    component: MenuItemQuantityPopupPage,
    data: {
      preload: true
    }
  },
  {
    path: 'menu-order-pay',
    component: MenuOrderPayPage,
    data: {
      preload: true
    }
  },
  {
    path: 'menu-payment-popup',
    component: MenuPaymentPopupPage,
    data: {
      preload: true
    }
  },
  {
    path: 'menu-service',
    component: MenuServicePage,
    data: {
      preload: true
    }
  },
  {
    path: 'menu-service-options',
    component: MenuServiceOptionsPage,
    data: {
      preload: true
    }
  },
  {
    path: 'menu-sold-popup',
    component: MenuSoldPopupPage,
    data: {
      preload: true
    }
  },
  {
    path: 'open-session',
    component: OpenSessionPage,
    data: {
      preload: true
    }
  },
  {
    path: 'patron-list-modal',
    component: PatronListModalPage,
    data: {
      preload: true
    }
  },
  {
    path: 'payments',
    component: PaymentsPage,
    data: {
      preload: true
    }
  },
  {
    path: 'pre-orders',
    component: PreOrdersPage,
    data: {
      preload: true
    }
  },
  {
    path: 'reset-password',
    component: ResetPasswordPage,
    data: {
      preload: true
    }
  },
  {
    path: 'sale-details-popup',
    component: SaleDetailsPopupPage,
    data: {
      preload: true
    }
  },
  {
    path: 'school-selection',
    component: SchoolSelectionPage,
    data: {
      preload: true
    }
  },
  {
    path: 'schoolcafe-url-search',
    component: SchoolcafeUrlSearchPage,
    data: {
      preload: true
    }
  },
  {
    path: 'service-selection',
    component: ServiceSelectionPage,
    data: {
      preload: true
    }
  },
  {
    path: 'session-info',
    loadChildren: './pages/session-info/session-info.module#SessionInfoPageModule',
    data: {
      preload: true
    }
  },
  {
    path: 'setting-values',
    loadChildren: './pages/setting-values/setting-values.module#SettingValuesPageModule',
    data: {
      preload: true
    }
  },
  {
    path: 'status-popup',
    component: StatusPopupPage,
    data: {
      preload: true
    }
  },
  {
    path: 'summary-sales-close-session',
    component: CloseSessionPage,
    data: {
      preload: true
    }
  },
  {
    path: 'summary-sale',
    component: OpenSessionPage,
    data: {
      preload: true
    }
  },
  {
    path: 'record-sales',
    component: SummarySalePage,
    data: {
      preload: true
    }
  },
  {
    path: 'tabs',
    component: TabsPage,
    data: {
      preload: true
    }
  },
  {
    path: 'transaction-details-popup',
    component: TransactionDetailsPopupPage,
    data: {
      preload: true
    }
  },
  {
    path: 'user-details-popup',
    component: UserDetailsPopupPage,
    data: {
      preload: true
    }
  },
  {
    path: 'transaction-meal-type-popup',
    component: TransactionMealTypePopupPage,
    data: {
      preload: true
    }
  }
];

@NgModule({
  imports: [
    RouterModule.forRoot(routes)
  ],
  exports: [RouterModule]
})
export class AppRoutingModule { }
