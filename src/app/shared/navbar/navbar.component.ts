import { DOCUMENT } from '@angular/common';
import { AfterViewChecked, Component, EventEmitter, HostListener, Inject, Input, OnChanges, OnDestroy, Output, SimpleChanges } from '@angular/core';
import { Subscription } from 'rxjs';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs/operators';

import { NotificationService } from '../../Servicos/notification.service';
import { UsuarioService } from '../../Servicos/usuario.service';
import { UserRole, Usuario } from '../../Usuarios/usuario';
import { PageIconName } from '../page-icon/page-icon.component';
import { ProviderStatusService } from '../../Servicos/provider-status.service';
import { UserIntent, UserIntentService } from '../../Servicos/user-intent.service';

interface OrderNotification {
  id?: string;
  route: any[] | string;
  title: string;
  date: string;
  city: string;
}

interface NavigationGroup {
  id: string;
  headerIcon?: PageIconName;
  label: string;
  icon: string;
  adminOnly?: boolean;
  links: NavigationLink[];
}

interface NavigationLink { label: string; route: string; icon: PageIconName; }

@Component({
  standalone: false,
  selector: 'app-navbar',
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.css']
})
export class NavbarComponent implements AfterViewChecked, OnChanges, OnDestroy {
  @Input() authenticated = false;
  @Input() userId: string;
  @Input() hideSearch = false;
  @Input() pageTitle = '';
  @Output() logout = new EventEmitter<void>();

  menuOpen = false;
  notificationMenuOpen = false;
  profileMenuOpen = false;
  sidebarOpen = false;
  openDesktopGroupId = '';
  accountLinks: NavigationGroup['links'] = [];
  notificationCount = 0;
  notificationItems: OrderNotification[] = [];
  user: Usuario;
  searchQuery = '';
  private navigationSubscription: Subscription;
  navigationGroups: NavigationGroup[] = [];
  readonly mainLinks: NavigationLink[] = [
    { label: 'Visão geral', route: '/inicio', icon: 'grid' },
    { label: 'Encontrar profissionais', route: '/feed', icon: 'search' },
    { label: 'Destaques', route: '/destaques', icon: 'star' },
    { label: 'Mensagens', route: '/conversas', icon: 'message' }
  ];
  private orderSubscription: Subscription;
  private userSubscription: Subscription;
  private focusSidebarPending = false;
  private providerSubscription: Subscription;
  isProvider = false;
  roleModalOpen = false;

  constructor(
    private notificationService: NotificationService,
    private usuarioService: UsuarioService,
    private providerStatus: ProviderStatusService,
    private userIntent: UserIntentService,
    private router: Router,
    @Inject(DOCUMENT) private document: Document
  ) {
    this.searchQuery = this.router.parseUrl(this.router.url).queryParams['q'] || '';
    this.navigationSubscription = this.router.events.pipe(filter(event => event instanceof NavigationEnd)).subscribe(() => {
      this.searchQuery = this.router.parseUrl(this.router.url).queryParams['q'] || '';
      this.closeSidebar();
      this.closeAccountMenusFromOutside();
    });
  }

  ngOnChanges(changes: SimpleChanges) {
    this.updateAuthenticatedLayout();
    this.buildNavigation();

    if ((changes.userId || changes.authenticated) && this.authenticated && this.userId) {
      this.loadUser();
      this.loadReceivedOrders();
      this.loadProviderStatus();
    }

    if (!this.authenticated) {
      this.clearOrderSubscription();
      this.clearUserSubscription();
      this.notificationCount = 0;
      this.notificationItems = [];
      this.user = null;
    }
  }

  ngOnDestroy() {
    this.navigationSubscription?.unsubscribe();
    this.providerSubscription?.unsubscribe();
    this.clearOrderSubscription();
    this.clearUserSubscription();
    this.document.body.classList.remove('authenticated-layout', 'navigation-open');
  }

  toggleMenu(){
    this.menuOpen = !this.menuOpen;
  }

  /** Antes de entrar ou criar conta, pergunta se a pessoa quer prestar ou contratar serviços. */
  openAuth(event: Event, mode: 'login' | 'register') {
    event.preventDefault();
    this.closeMenu();
    if (!this.userIntent.hasChosen) {
      this.roleModalOpen = true;
      return;
    }
    this.userIntent.goToLogin(mode);
  }

  chooseRole(intent: UserIntent) {
    this.roleModalOpen = false;
    this.userIntent.chooseAndGo(intent);
  }

  closeMenu(){
    this.menuOpen = false;
  }

  toggleSidebar(event: Event) {
    event.stopPropagation();
    this.sidebarOpen = !this.sidebarOpen;
    this.document.body.classList.toggle('navigation-open', this.sidebarOpen);
    this.focusSidebarPending = this.sidebarOpen;
    this.closeNotificationMenu();
    this.closeProfileMenu();
  }

  closeSidebar(restoreFocus = false) {
    const wasOpen = this.sidebarOpen;
    this.sidebarOpen = false;
    this.focusSidebarPending = false;
    this.document.body.classList.remove('navigation-open');
    if (wasOpen && restoreFocus) this.document.querySelector<HTMLElement>('.authenticated-menu-toggle')?.focus();
  }

  ngAfterViewChecked() {
    if (!this.focusSidebarPending) return;
    this.focusSidebarPending = false;
    this.document.defaultView?.requestAnimationFrame(() => {
      this.focusSidebarStart();
    });
  }

  focusSidebarAfterTransition(event: TransitionEvent) {
    if (this.sidebarOpen && event.target === event.currentTarget && event.propertyName === 'transform') {
      this.focusSidebarStart();
    }
  }

  private focusSidebarStart() {
    const navigation = this.document.getElementById('accountNavigation');
    if (this.sidebarOpen && navigation && !navigation.contains(this.document.activeElement)) {
      navigation.querySelector<HTMLElement>('a')?.focus();
    }
  }

  toggleDesktopGroup(event: Event, groupId: string) {
    event.preventDefault();
    event.stopPropagation();
    this.openDesktopGroupId = this.openDesktopGroupId === groupId ? '' : groupId;
    this.closeNotificationMenu();
    this.closeProfileMenu();
  }

  closeDesktopNavigation() {
    this.openDesktopGroupId = '';
  }

  @HostListener('window:resize')
  closeSidebarOnDesktop() {
    if (this.sidebarOpen && this.document.defaultView?.matchMedia('(min-width: 1201px)').matches) this.closeSidebar();
  }

  @HostListener('document:keydown', ['$event'])
  keepFocusInsideSidebar(event: KeyboardEvent) {
    if (!this.sidebarOpen || event.key !== 'Tab') return;
    const links = Array.from(this.document.querySelectorAll<HTMLElement>('#accountNavigation a[href], #accountNavigation summary'))
      .filter(link => link.getClientRects().length > 0);
    const firstLink = links[0];
    const lastLink = links[links.length - 1];
    if (event.shiftKey && this.document.activeElement === firstLink) {
      event.preventDefault();
      lastLink?.focus();
    } else if (!event.shiftKey && this.document.activeElement === lastLink) {
      event.preventDefault();
      firstLink?.focus();
    }
  }

  searchServices() {
    const query = this.searchQuery.trim();
    this.closeSidebar();
    this.closeNotificationMenu();
    this.closeProfileMenu();
    void this.router.navigate(['/feed'], { queryParams: { q: query || null } });
  }

  isGroupActive(group: NavigationGroup) {
    return group.links.some(link => this.router.isActive(link.route, { paths: link.route === '/usuario/' + this.userId ? 'exact' : 'subset', queryParams: 'ignored', fragment: 'ignored', matrixParams: 'ignored' }));
  }

  private buildNavigation() {
    this.navigationGroups = [
      { id: 'hiring', headerIcon: 'briefcase', label: 'Contratações', icon: 'M4 4h16v16H4zM8 9h8M8 14h5', links: [
        { label: 'Meus serviços', route: '/meus-servicos', icon: 'briefcase' },
        { label: 'Orçamentos pedidos', route: '/solicitacoes', icon: 'document' },
        { label: 'Profissionais salvos', route: '/favoritos', icon: 'heart' }
      ] },
      { id: 'professional', headerIcon: 'chart', label: 'Profissional', icon: 'M4 7h16v13H4zM9 7V4h6v3M4 12h16', links: [
        { label: 'Painel profissional', route: '/painel-profissional', icon: 'chart' },
        { label: 'Oportunidades', route: '/oportunidades', icon: 'location' },
        { label: 'Pedidos recebidos', route: '/usuario/' + this.userId + '/pedidos-recebidos', icon: 'bell' },
        { label: 'Agenda', route: '/agenda', icon: 'calendar' },
        { label: 'Minhas publicações', route: '/destaques/minhas', icon: 'star' },
        { label: 'Verificação', route: '/verificacao', icon: 'shield' }
      ] },
      { id: 'account', headerIcon: 'profile', label: 'Conta', icon: 'M4 21a8 8 0 0 1 16 0M16 8a4 4 0 1 1-8 0 4 4 0 0 1 8 0', links: [
        { label: 'Meu perfil', route: '/usuario/' + this.userId, icon: 'profile' },
        { label: 'Editar dados', route: '/editar', icon: 'edit' },
        { label: 'Notificações', route: '/notificacoes', icon: 'bell' },
        { label: 'Preferências', route: '/preferencias-notificacoes', icon: 'settings' }
      ] },
      { id: 'administration', headerIcon: 'shield', label: 'Administração', icon: 'M12 3l8 4v5c0 5-4 8-8 9-4-1-8-4-8-9V7zM9 12l2 2 4-4', adminOnly: true, links: [
        { label: 'Denúncias e suporte', route: '/admin/casos', icon: 'shield' },
        { label: 'Publicações', route: '/admin/publicacoes', icon: 'document' },
        { label: 'Verificação de documentos', route: '/admin/verificacoes', icon: 'check' }
      ] }
    ];
    if (!this.isProvider) {
      const professional = this.navigationGroups.find(group => group.id === 'professional');
      professional.links = [{ label: 'Oferecer meus serviços', route: '/serprofissional', icon: 'briefcase' }];
    }
    this.accountLinks = this.navigationGroups.find(group => group.id === 'account').links;
  }

  toggleProfileMenu(event: Event) {
    event.stopPropagation();
    this.closeDesktopNavigation();
    this.profileMenuOpen = !this.profileMenuOpen;
    this.closeNotificationMenu();
  }

  closeProfileMenu() {
    this.profileMenuOpen = false;
  }

  toggleNotificationMenu(event: Event) {
    event.stopPropagation();
    this.closeDesktopNavigation();
    this.notificationMenuOpen = !this.notificationMenuOpen;
    this.closeProfileMenu();
  }

  closeNotificationMenu() {
    this.notificationMenuOpen = false;
  }

  readNotification(notification: OrderNotification) {
    if (notification.id) {
      this.notificationService.markRead(notification.id).subscribe(() => this.loadReceivedOrders());
    }
    this.closeNotificationMenu();
  }

  @HostListener('document:click')
  closeAccountMenusFromOutside() {
    this.closeDesktopNavigation();
    this.closeNotificationMenu();
    this.closeProfileMenu();
  }

  @HostListener('document:keydown.escape')
  closeMenuWithKeyboard(){
    this.document.querySelector<HTMLElement>('.desktop-menu[open] > summary')?.focus();
    this.closeDesktopNavigation();
    this.closeMenu();
    this.closeNotificationMenu();
    this.closeProfileMenu();
    this.closeSidebar(true);
  }

  get visibleMainLinks() { return this.isProvider ? this.mainLinks : this.mainLinks.filter(link => link.route !== '/inicio'); }

  get homeRoute() { return this.isProvider ? '/inicio' : '/feed'; }

  private loadProviderStatus() {
    this.providerSubscription?.unsubscribe();
    this.providerSubscription = this.providerStatus.isProvider(this.userId).subscribe(isProvider => {
      this.isProvider = isProvider;
      this.buildNavigation();
    });
  }

  requestLogout(){
    NavbarComponent.userCache = null;
    this.providerStatus.invalidate();
    this.closeMenu();
    this.closeNotificationMenu();
    this.closeProfileMenu();
    this.closeSidebar();
    this.logout.emit();
  }

  /** Saudação pelo horário local: "Bom dia", "Boa tarde" ou "Boa noite". */
  get greeting() {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return 'Bom dia';
    if (hour >= 12 && hour < 18) return 'Boa tarde';
    return 'Boa noite';
  }

  get userFirstName() {
    if (!this.user || !this.user.nome) {
      return 'Usuário';
    }

    return this.user.nome.split(' ')[0];
  }

  get userInitial() {
    return this.userFirstName.charAt(0).toUpperCase();
  }

  get isAdmin() {
    return this.user && this.user.role === UserRole.Admin;
  }

  get notificationAriaLabel() {
    if (this.notificationCount === 0) {
      return 'Nenhuma atualização pendente';
    }

    if (this.notificationCount === 1) {
      return '1 atualização pendente';
    }

    return `${this.notificationCount} atualizações pendentes`;
  }

  get notificationBadgeLabel() {
    if (this.notificationCount > 9) {
      return '9+';
    }

    return this.notificationCount.toString();
  }

  hideUnavailableUserPhoto() {
    if (this.user) {
      this.user.foto = '';
    }
  }

  /** O navbar é recriado a cada página; o cache evita que o nome e a foto "pisquem" na troca de tela. */
  private static userCache: { id: string; user: Usuario } | null = null;

  private loadUser() {
    this.clearUserSubscription();
    const cached = NavbarComponent.userCache;
    if (cached && cached.id === this.userId) {
      this.user = cached.user;
    }
    this.userSubscription = this.usuarioService.getUserWithProfilePhoto(this.userId).subscribe(user => {
      this.user = user;
      NavbarComponent.userCache = { id: this.userId, user };
    });
  }

  private loadReceivedOrders() {
    this.clearOrderSubscription();
    this.orderSubscription = this.notificationService.findNotifications().subscribe(apiNotifications => {
      const unreadNotifications = apiNotifications.filter(notification => !notification.readAt);
      const notifications = unreadNotifications.map(notification => ({
        id: notification.id,
        route: notification.actionUrl,
        title: notification.title,
        date: new Date(notification.createdAt).toLocaleString('pt-BR', {
          day: '2-digit',
          month: '2-digit',
          hour: '2-digit',
          minute: '2-digit'
        }),
        city: ''
      }));
      this.notificationCount = notifications.length;
      this.notificationItems = notifications.slice(0, 4);
    });
  }

  private clearOrderSubscription() {
    if (this.orderSubscription) {
      this.orderSubscription?.unsubscribe();
      this.orderSubscription = null;
    }
  }

  private clearUserSubscription() {
    if (this.userSubscription) {
      this.userSubscription?.unsubscribe();
      this.userSubscription = null;
    }
  }

  private updateAuthenticatedLayout() {
    if (this.authenticated) {
      this.document.body.classList.add('authenticated-layout');
      return;
    }

    this.document.body.classList.remove('authenticated-layout');
  }
}
