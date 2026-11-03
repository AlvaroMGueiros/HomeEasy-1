import { DOCUMENT } from '@angular/common';
import { AfterViewChecked, Component, EventEmitter, HostListener, Inject, Input, OnChanges, OnDestroy, Output, SimpleChanges } from '@angular/core';
import { Subscription } from 'rxjs';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs/operators';

import { NotificationService } from '../../Servicos/notification.service';
import { UsuarioService } from '../../Servicos/usuario.service';
import { UserRole, Usuario } from '../../Usuarios/usuario';

interface OrderNotification {
  id?: string;
  route: any[] | string;
  title: string;
  date: string;
  city: string;
}

interface NavigationGroup {
  id: string;
  label: string;
  icon: string;
  adminOnly?: boolean;
  links: { label: string; route: string }[];
}

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
  private orderSubscription: Subscription;
  private userSubscription: Subscription;
  private focusSidebarPending = false;

  constructor(
    private notificationService: NotificationService,
    private usuarioService: UsuarioService,
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
    this.clearOrderSubscription();
    this.clearUserSubscription();
    this.document.body.classList.remove('authenticated-layout', 'navigation-open');
  }

  toggleMenu(){
    this.menuOpen = !this.menuOpen;
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
      { id: 'hiring', label: 'Contratações', icon: 'M4 4h16v16H4zM8 9h8M8 14h5', links: [
        { label: 'Meus serviços', route: '/meus-servicos' },
        { label: 'Orçamentos pedidos', route: '/solicitacoes' },
        { label: 'Profissionais salvos', route: '/favoritos' }
      ] },
      { id: 'professional', label: 'Área profissional', icon: 'M4 7h16v13H4zM9 7V4h6v3M4 12h16', links: [
        { label: 'Visão geral', route: '/painel-profissional' },
        { label: 'Oportunidades', route: '/oportunidades' },
        { label: 'Pedidos recebidos', route: '/usuario/' + this.userId + '/pedidos-recebidos' },
        { label: 'Agenda', route: '/agenda' },
        { label: 'Minhas publicações', route: '/destaques/minhas' },
        { label: 'Documentos e verificação', route: '/verificacao' }
      ] },
      { id: 'account', label: 'Minha conta', icon: 'M4 21a8 8 0 0 1 16 0M16 8a4 4 0 1 1-8 0 4 4 0 0 1 8 0', links: [
        { label: 'Meu perfil', route: '/usuario/' + this.userId },
        { label: 'Editar dados', route: '/editar' },
        { label: 'Notificações', route: '/notificacoes' },
        { label: 'Preferências', route: '/preferencias-notificacoes' }
      ] },
      { id: 'administration', label: 'Administração', icon: 'M12 3l8 4v5c0 5-4 8-8 9-4-1-8-4-8-9V7zM9 12l2 2 4-4', adminOnly: true, links: [
        { label: 'Denúncias e suporte', route: '/admin/casos' },
        { label: 'Publicações', route: '/admin/publicacoes' },
        { label: 'Verificação de documentos', route: '/admin/verificacoes' }
      ] }
    ];
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

  requestLogout(){
    this.closeMenu();
    this.closeNotificationMenu();
    this.closeProfileMenu();
    this.closeSidebar();
    this.logout.emit();
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

  private loadUser() {
    this.clearUserSubscription();
    this.userSubscription = this.usuarioService.getUserWithProfilePhoto(this.userId).subscribe(user => {
      this.user = user;
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
