import { Component, inject, signal, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BaseComponent } from '../../../core/models/base-component';
import { AdminService, AdminUser } from '../../../core/services/admin.service';
import { NotificationService } from '../../../core/services/notification.service';
import { takeUntil } from 'rxjs/operators';
import { formatBytes } from '../../../core/utils/format.utils';

import { ModalComponent } from '../../../shared/components/modal/modal.component';
import { AuthService } from '../../../core/services/auth.service';
import { Router } from '@angular/router';
import { LayoutService } from '../../../core/services/layout.service';

@Component({
  selector: 'app-user-management',
  standalone: true,
  imports: [CommonModule, FormsModule, ModalComponent],
  template: `
    <div class="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">

      <!-- Header -->
      <header class="pb-10 border-b-2 border-editorial-text flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div class="space-y-3">
          <p class="font-mono text-[10px] uppercase tracking-[0.5em] text-editorial-text/30 italic">Admin / User_Management</p>
          <h1 class="text-5xl md:text-6xl font-sans font-black tracking-tighter text-editorial-text uppercase italic leading-none">User_Registry</h1>
          <p class="font-mono text-[10px] uppercase tracking-[0.4em] text-editorial-text/50">Account control, role assignment &amp; suspension protocol</p>
        </div>
        <div class="flex items-center gap-6">
          <button (click)="openCreateModal()" 
                  class="px-8 py-4 bg-editorial-text text-editorial-bg font-sans font-black text-xs uppercase italic tracking-tighter hover:tracking-normal transition-all active:scale-95 shadow-brutalist">
            Provision_New_Entity
          </button>
          <div class="flex items-center gap-3">
            @if (isBusy()) {
              <div class="w-4 h-4 border border-editorial-text/30 border-t-editorial-text rounded-full animate-spin"></div>
            }
            <div class="px-4 py-2 border border-editorial-text/20 font-mono text-[9px] uppercase tracking-widest text-editorial-text/50">
              {{ filtered().length }}_Records
            </div>
          </div>
        </div>
      </header>

      <!-- Filters -->
      <div class="flex flex-col sm:flex-row gap-4">
        <div class="relative flex-1">
          <input
            [(ngModel)]="searchQuery"
            (ngModelChange)="onSearch()"
            placeholder="Search users..."
            class="w-full bg-transparent border border-editorial-text/20 px-5 py-3.5 font-mono text-xs uppercase tracking-widest text-editorial-text placeholder:text-editorial-text/20 focus:outline-none focus:border-editorial-text transition-colors"
          />
          <div class="absolute right-4 top-1/2 -translate-y-1/2 text-editorial-text/20 font-mono text-[9px] uppercase tracking-widest pointer-events-none">Search_Node</div>
        </div>

        <!-- Status Filter -->
        <div class="flex gap-2">
          @for (f of statusFilters; track f.value) {
            <button
              (click)="statusFilter.set(f.value)"
              [class.bg-editorial-text]="statusFilter() === f.value"
              [class.text-editorial-bg]="statusFilter() === f.value"
              [class.text-editorial-text]="statusFilter() !== f.value"
              class="px-5 py-3 border border-editorial-text/20 font-mono text-[9px] uppercase tracking-widest transition-all hover:border-editorial-text">
              {{ f.label }}
            </button>
          }
        </div>
      </div>

      <!-- User Table -->
      <div class="overflow-x-auto">
        <table class="w-full border-collapse">
          <thead>
            <tr class="border-b border-editorial-text/20">
              <th class="text-left py-5 font-mono text-[8px] uppercase tracking-[0.5em] text-editorial-text/30 pr-6">User</th>
              <th class="text-left py-5 font-mono text-[8px] uppercase tracking-[0.5em] text-editorial-text/30 pr-6 hidden md:table-cell">Role</th>
              <th class="text-left py-5 font-mono text-[8px] uppercase tracking-[0.5em] text-editorial-text/30 pr-6 hidden lg:table-cell">Storage</th>
              <th class="text-left py-5 font-mono text-[8px] uppercase tracking-[0.5em] text-editorial-text/30 pr-6 hidden xl:table-cell">Last_Login</th>
              <th class="text-left py-5 font-mono text-[8px] uppercase tracking-[0.5em] text-editorial-text/30 pr-6">Status</th>
              <th class="text-right py-5 font-mono text-[8px] uppercase tracking-[0.5em] text-editorial-text/30">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-editorial-text/5">
            @for (user of filtered(); track user.id) {
              <tr class="group hover:bg-editorial-text/[0.02] transition-colors" [class.opacity-50]="!user.isActive">

                <!-- User Info -->
                <td class="py-6 pr-6">
                  <div class="flex items-center gap-4">
                    <div class="w-9 h-9 bg-editorial-text/10 flex items-center justify-center font-black text-sm text-editorial-text flex-shrink-0">
                      {{ user.username[0].toUpperCase() }}
                    </div>
                    <div>
                      <div class="font-mono text-[11px] uppercase tracking-[0.2em] font-bold text-editorial-text">{{ user.username }}</div>
                      <div class="font-mono text-[9px] text-editorial-text/30 mt-0.5">{{ user.email }}</div>
                    </div>
                  </div>
                </td>

                <!-- Role -->
                <td class="py-6 pr-6 hidden md:table-cell">
                   <span class="px-3 py-1 border text-[8px] font-mono uppercase tracking-widest border-editorial-text/20 text-editorial-text/60">
                    {{ user.role }}
                   </span>
                </td>

                <!-- Storage bar -->
                <td class="py-6 pr-6 hidden lg:table-cell">
                  <div class="space-y-1.5 min-w-[120px] group/storage cursor-pointer outline-none focus:ring-1 focus:ring-editorial-text/20" 
                       tabindex="0" 
                       (click)="openQuotaModal(user)"
                       (keyup.enter)="openQuotaModal(user)">
                    <div class="flex justify-between items-center opacity-0 group-hover/storage:opacity-100 transition-opacity">
                       <span class="text-[7px] font-mono uppercase tracking-widest text-editorial-text/40 italic">Adjust_Limit</span>
                    </div>
                    <div class="h-1.5 bg-editorial-text/5 overflow-hidden">
                      <div class="h-full bg-editorial-text transition-all"
                           [style.width.%]="storagePercent(user)"
                           [class.bg-rose-500]="storagePercent(user) > 90"
                           [class.bg-amber-500]="storagePercent(user) > 70 && storagePercent(user) <= 90"></div>
                    </div>
                    <div class="font-mono text-[8px] text-editorial-text/30 uppercase tracking-widest flex justify-between">
                       <span>{{ formatBytes(user.storageUsed) }}</span>
                       <span class="text-editorial-text/10 italic">/ {{ formatBytes(user.storageQuota) }}</span>
                    </div>
                  </div>
                </td>

                <!-- Last login -->
                <td class="py-6 pr-6 hidden xl:table-cell">
                  <span class="font-mono text-[9px] text-editorial-text/40 italic">
                    @if (user.lastLoginAt) {
                      {{ user.lastLoginAt | date:'MMM dd, HH:mm' }}
                    } @else {
                      Never
                    }
                  </span>
                </td>

                <!-- Status badge -->
                <td class="py-6 pr-6">
                  <span class="px-3 py-1 border text-[8px] font-mono uppercase tracking-widest"
                        [class.border-emerald-500/30]="user.isActive"
                        [class.text-emerald-500]="user.isActive"
                        [class.border-rose-500/30]="!user.isActive"
                        [class.text-rose-500]="!user.isActive">
                    {{ user.isActive ? 'ACTIVE' : 'SUSPENDED' }}
                  </span>
                </td>

                <td class="py-6 text-right">
                  <div class="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <!-- Impersonate -->
                    <button
                      (click)="impersonate(user)"
                      title="Impersonate User"
                      class="p-2 border border-blue-500/10 hover:border-blue-500 text-blue-500/40 hover:text-blue-500 transition-all">
                      <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"/></svg>
                    </button>
                    <!-- Suspend/Activate -->
                    <button
                      (click)="toggleSuspend(user)"
                      [title]="!user.isActive ? 'Activate' : 'Suspend'"
                      class="p-2 border border-editorial-text/10 hover:border-editorial-text text-editorial-text/40 hover:text-editorial-text transition-all">
                      @if (!user.isActive) {
                        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                      } @else {
                        <svg class="w-3.5 h-3.5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"/></svg>
                      }
                    </button>
                  </div>
                </td>
              </tr>
            } @empty {
              <tr>
                <td colspan="6" class="py-24 text-center">
                  <p class="font-mono text-[10px] uppercase tracking-[0.6em] text-editorial-text/10">Null_Registry: No_Matching_Users</p>
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>

      <!-- Footer pagination hint -->
    </div>

    <!-- Create User Modal -->
    <app-modal [isOpen]="isCreateModalOpen" title="Account_Provision" (closed)="isCreateModalOpen = false">
      <div class="space-y-10 py-4">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-10">
          <div class="space-y-3">
             <label for="username" class="font-mono text-[9px] uppercase tracking-widest text-editorial-text/40 ml-4 italic">Identity.username</label>
             <input id="username" [(ngModel)]="newUser.username" placeholder="eg: agent_smith" 
                    class="w-full bg-editorial-text/[0.03] border border-editorial-text/10 px-6 py-4 font-mono text-xs text-editorial-text focus:outline-none focus:border-editorial-text" />
          </div>
          <div class="space-y-3">
             <label for="role" class="font-mono text-[9px] uppercase tracking-widest text-editorial-text/40 ml-4 italic">Security.role</label>
             <select id="role" [(ngModel)]="newUser.role" 
                    class="w-full bg-editorial-text/[0.03] border border-editorial-text/10 px-6 py-4 font-mono text-xs text-editorial-text focus:outline-none focus:border-editorial-text appearance-none">
                <option value="User">ENTITY_USER</option>
                <option value="Admin">ENTITY_ADMIN</option>
             </select>
          </div>
        </div>
        <div class="space-y-3">
           <label for="email" class="font-mono text-[9px] uppercase tracking-widest text-editorial-text/40 ml-4 italic">Communication.email</label>
           <input id="email" [(ngModel)]="newUser.email" placeholder="eg: smith@matrix.io" 
                  class="w-full bg-editorial-text/[0.03] border border-editorial-text/10 px-6 py-4 font-mono text-xs text-editorial-text focus:outline-none focus:border-editorial-text" />
        </div>
        <div class="space-y-3">
           <label for="password" class="font-mono text-[9px] uppercase tracking-widest text-editorial-text/40 ml-4 italic">Security.password</label>
           <input id="password" [(ngModel)]="newUser.password" type="password" placeholder="••••••••" 
                  class="w-full bg-editorial-text/[0.03] border border-editorial-text/10 px-6 py-4 font-mono text-xs text-editorial-text focus:outline-none focus:border-editorial-text" />
        </div>
      </div>
      <div footer class="flex justify-end gap-6 w-full">
         <button (click)="isCreateModalOpen = false" class="px-8 py-3 font-mono text-[9px] uppercase tracking-widest text-editorial-text/40 hover:text-editorial-text transition-all">Cancel</button>
         <button (click)="submitCreateUser()" [disabled]="isBusy()"
                 class="px-12 py-3 bg-editorial-text text-editorial-bg font-sans font-black text-[10px] uppercase italic tracking-widest hover:tracking-[0.2em] transition-all disabled:opacity-50">
            Initialize_Sequence
         </button>
      </div>
    </app-modal>

    <!-- Quota Modal -->
    <app-modal [isOpen]="isQuotaModalOpen" title="Quota_Calibration" (closed)="isQuotaModalOpen = false">
      @if (selectedUser(); as u) {
        <div class="space-y-10 py-4">
          <div class="flex justify-between items-end border-b border-editorial-text/10 pb-6">
             <div class="space-y-1">
                <h4 class="font-mono text-[11px] font-bold text-editorial-text uppercase tracking-widest">Active_Node: {{ u.username }}</h4>
                <p class="font-mono text-[9px] text-editorial-text/40 uppercase tracking-widest">Current_Cap: {{ formatBytes(u.storageQuota) }}</p>
             </div>
             <div class="font-mono text-[40px] font-black text-editorial-text/5 tracking-tighter">{{ quotaInGB }}GB</div>
          </div>
          <div class="space-y-6">
             <label for="quota-range" class="font-mono text-[9px] uppercase tracking-widest text-editorial-text/40 ml-4 italic">Storage_Capacity_GB</label>
             <input id="quota-range" type="range" min="1" max="100" [(ngModel)]="quotaInGB" class="w-full h-1 bg-editorial-text/10 appearance-none cursor-pointer accent-editorial-text" />
             <div class="flex justify-between font-mono text-[8px] text-editorial-text/30 uppercase tracking-[0.3em]">
                <span>1GB</span>
                <span>50GB</span>
                <span>100GB</span>
             </div>
          </div>
        </div>
      }
      @if (selectedUser(); as u) {
        <div footer class="flex justify-end gap-6 w-full">
           <button (click)="isQuotaModalOpen = false" class="px-8 py-3 font-mono text-[9px] uppercase tracking-widest text-editorial-text/40 hover:text-editorial-text transition-all">Abort</button>
           <button (click)="submitQuotaUpdate()" [disabled]="isBusy()"
                   class="px-12 py-3 bg-editorial-text text-editorial-bg font-sans font-black text-[10px] uppercase italic tracking-widest hover:tracking-[0.2em] transition-all">
              Apply_Configuration
           </button>
        </div>
      }
    </app-modal>
  `
})
export class UserManagementComponent extends BaseComponent implements OnInit {
  private adminService = inject(AdminService);
  private authService = inject(AuthService);
  private notificationService = inject(NotificationService);
  private router = inject(Router);
  private layoutService = inject(LayoutService);

  users = signal<AdminUser[]>([]);
  searchQuery = '';
  statusFilter = signal<string>('all');
  formatBytes = formatBytes;

  // Modals
  isCreateModalOpen = false;
  isQuotaModalOpen = false;
  selectedUser = signal<AdminUser | null>(null);
  newUser = { username: '', email: '', password: '', role: 'User', storageQuota: 5368709120 };
  quotaInGB = 5;

  statusFilters = [
    { label: 'All', value: 'all' },
    { label: 'Active', value: 'active' },
    { label: 'Suspended', value: 'suspended' },
  ];

  filtered = computed(() => {
    let list = this.users();
    const q = this.searchQuery.toLowerCase().trim();
    const status = this.statusFilter();
    if (q) list = list.filter(u => u.username.toLowerCase().includes(q) || u.email.toLowerCase().includes(q));
    if (status === 'active') list = list.filter(u => u.isActive);
    if (status === 'suspended') list = list.filter(u => !u.isActive);
    return list;
  });

  ngOnInit() {
    this.loadUsers();
  }

  private loadUsers() {
    this.isBusy.set(true);
    this.adminService.getUsers().pipe(takeUntil(this.destroy$)).subscribe({
      next: users => { this.users.set(users); this.isBusy.set(false); },
      error: () => this.isBusy.set(false)
    });
  }

  onSearch() {
    // reactive via computed signal
  }

  storagePercent(user: AdminUser): number {
    if (!user.storageQuota) return 0;
    return Math.round((user.storageUsed / user.storageQuota) * 100);
  }

  toggleSuspend(user: AdminUser) {
    const newIsActive = !user.isActive;
    this.adminService.toggleUserStatus(user.id, newIsActive).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.users.update(list => list.map(u => u.id === user.id ? { ...u, isActive: newIsActive } : u));
        if (!newIsActive) {
          this.notificationService.warning(`${user.username} suspended.`);
        } else {
          this.notificationService.success(`${user.username} reactivated.`);
        }
      },
      error: () => this.notificationService.error('Action failed. Try again.')
    });
  }

  // --- Advanced Actions ---

  openCreateModal() {
    this.newUser = { username: '', email: '', password: '', role: 'User', storageQuota: 5368709120 };
    this.isCreateModalOpen = true;
  }

  submitCreateUser() {
    if (!this.newUser.username || !this.newUser.email || !this.newUser.password) {
      this.notificationService.error('Incomplete Identity Fields.');
      return;
    }
    this.isBusy.set(true);
    this.adminService.createUser(this.newUser).pipe(takeUntil(this.destroy$)).subscribe({
      next: user => {
        this.users.update(list => [user, ...list]);
        this.isCreateModalOpen = false;
        this.notificationService.success(`Entity ${user.username} provisioned.`);
        this.isBusy.set(false);
      },
      error: () => {
        this.notificationService.error('Provisioning failed.');
        this.isBusy.set(false);
      }
    });
  }

  openQuotaModal(user: AdminUser) {
    this.selectedUser.set(user);
    this.quotaInGB = Math.round(user.storageQuota / (1024 * 1024 * 1024));
    this.isQuotaModalOpen = true;
  }

  submitQuotaUpdate() {
    const user = this.selectedUser();
    if (!user) return;
    
    this.isBusy.set(true);
    const newLimit = this.quotaInGB * 1024 * 1024 * 1024;
    this.adminService.updateUserQuota(user.id, newLimit).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.users.update(list => list.map(u => u.id === user.id ? { ...u, storageQuota: newLimit } : u));
        this.isQuotaModalOpen = false;
        this.notificationService.info(`Quota for ${user.username} calibrated to ${this.quotaInGB}GB.`);
        this.isBusy.set(false);
      },
      error: () => {
        this.notificationService.error('Calibration failed.');
        this.isBusy.set(false);
      }
    });
  }

  impersonate(user: AdminUser) {
    this.layoutService.openConfirm({
      title: 'Initialize_Simulation',
      message: `Establish administrative simulation as ${user.username}? Full control transfer will occur.`,
      danger: true,
      action: () => {
        this.isBusy.set(true);
        this.adminService.impersonateUser(user.id).pipe(takeUntil(this.destroy$)).subscribe({
          next: (resp) => {
            localStorage.setItem('auth_token', resp.token);
            this.notificationService.success(`Transferring context to ${user.username}...`);
            setTimeout(() => {
              this.router.navigate(['/dashboard']);
              window.location.reload(); 
            }, 1000);
          },
          error: () => {
             this.notificationService.error('Simulation failed.');
             this.isBusy.set(false);
          }
        });
      }
    });
  }
}
