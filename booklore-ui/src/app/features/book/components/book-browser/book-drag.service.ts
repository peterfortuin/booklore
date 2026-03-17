import {inject, Injectable} from '@angular/core';
import {BookPatchService} from '../../service/book-patch.service';
import {ShelfService} from '../../service/shelf.service';
import {MessageService} from 'primeng/api';
import {TranslocoService} from '@jsverse/transloco';

@Injectable({providedIn: 'root'})
export class BookDragService {
  private readonly bookPatchService = inject(BookPatchService);
  private readonly shelfService = inject(ShelfService);
  private readonly messageService = inject(MessageService);
  private readonly translocoService = inject(TranslocoService);

  private _draggedBookIds: number[] = [];

  get draggedBookIds(): number[] {
    return this._draggedBookIds;
  }

  startDrag(bookIds: number[]): void {
    this._draggedBookIds = [...bookIds];
  }

  endDrag(): void {
    this._draggedBookIds = [];
  }

  dropOnShelf(shelfId: number, shelfLabel: string): void {
    const ids = this._draggedBookIds;
    if (ids.length === 0) {
      return;
    }

    this.bookPatchService.updateBookShelves(
      new Set(ids),
      new Set([shelfId]),
      new Set()
    ).subscribe({
      next: () => {
        this.shelfService.reloadShelves();
        const count = ids.length;
        const plural = count > 1;
        this.messageService.add({
          severity: 'success',
          summary: this.translocoService.translate(plural ? 'shared.shelf.dragDrop.success.summary_plural' : 'shared.shelf.dragDrop.success.summary'),
          detail: this.translocoService.translate(plural ? 'shared.shelf.dragDrop.success.detail_plural' : 'shared.shelf.dragDrop.success.detail', {shelf: shelfLabel, count}),
        });
      },
      error: () => {
        const plural = ids.length > 1;
        this.messageService.add({
          severity: 'error',
          summary: this.translocoService.translate(plural ? 'shared.shelf.dragDrop.error.summary_plural' : 'shared.shelf.dragDrop.error.summary'),
          detail: this.translocoService.translate(plural ? 'shared.shelf.dragDrop.error.detail_plural' : 'shared.shelf.dragDrop.error.detail'),
        });
      }
    });

    this.endDrag();
  }
}
