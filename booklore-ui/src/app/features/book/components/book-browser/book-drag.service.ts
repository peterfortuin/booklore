import {Injectable} from '@angular/core';
import {BookPatchService} from '../../service/book-patch.service';
import {ShelfService} from '../../service/shelf.service';
import {MessageService} from 'primeng/api';
import {TranslocoService} from '@jsverse/transloco';

@Injectable({providedIn: 'root'})
export class BookDragService {
  private _draggedBookIds: number[] = [];

  constructor(
    private bookPatchService: BookPatchService,
    private shelfService: ShelfService,
    private messageService: MessageService,
    private translocoService: TranslocoService
  ) {
  }

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
        this.messageService.add({
          severity: 'success',
          summary: this.translocoService.translate('shared.shelf.dragDrop.success.summary'),
          detail: this.translocoService.translate('shared.shelf.dragDrop.success.detail', {shelf: shelfLabel}),
        });
      },
      error: () => {
        this.messageService.add({
          severity: 'error',
          summary: this.translocoService.translate('shared.shelf.dragDrop.error.summary'),
          detail: this.translocoService.translate('shared.shelf.dragDrop.error.detail'),
        });
      }
    });

    this.endDrag();
  }
}
